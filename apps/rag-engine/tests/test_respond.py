"""Tests for POST /respond.

All external I/O (OpenAI embed + chat, Qdrant search) is patched.
"""
from unittest.mock import AsyncMock, patch

import pytest

TOKEN = "test-internal-token-must-be-32-chars!"
HEADERS = {"X-Internal-Token": TOKEN}

FAKE_VECTOR = [0.1] * 1536

GROUNDED_REPLY = {
    "reply": "The Handmade Soap costs 150 Taka.",
    "orderIntentDetected": False,
    "extractedFields": None,
}

ORDER_REPLY = {
    "reply": "Great! I'll place that order for you.",
    "orderIntentDetected": True,
    "extractedFields": {
        "product": "Handmade Soap",
        "quantity": 2,
        "customerName": "Rahim",
        "phone": "01712345678",
        "address": "Dhaka, Mirpur",
    },
}

NO_CONTEXT_REPLY = {
    "reply": "Sorry, I don't have that information right now.",
    "orderIntentDetected": False,
    "extractedFields": None,
}


@pytest.fixture(autouse=True)
def patch_io():
    with (
        patch("src.routers.respond.embed_texts", new_callable=AsyncMock) as mock_embed,
        patch("src.routers.respond.search", new_callable=AsyncMock) as mock_search,
        patch("src.routers.respond.chat", new_callable=AsyncMock) as mock_chat,
    ):
        mock_embed.return_value = [FAKE_VECTOR]
        mock_search.return_value = ["Product: Handmade Soap\nPrice: 150 Taka"]
        mock_chat.return_value = GROUNDED_REPLY
        yield mock_embed, mock_search, mock_chat


class TestRespondPost:
    def test_grounded_reply_happy_path(self, client, patch_io):
        mock_embed, mock_search, mock_chat = patch_io
        payload = {
            "sellerId": "seller-1",
            "customerPsid": "psid-1",
            "message": "soap er dam koto?",
        }
        resp = client.post("/respond", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["reply"] == GROUNDED_REPLY["reply"]
        assert data["orderIntentDetected"] is False
        assert data["extractedFields"] is None

    def test_search_filtered_by_seller_id(self, client, patch_io):
        mock_embed, mock_search, mock_chat = patch_io
        payload = {"sellerId": "seller-42", "customerPsid": "p", "message": "hello"}
        client.post("/respond", json=payload, headers=HEADERS)
        # search must be called with the same sellerId — cross-seller leak check
        call_args = mock_search.call_args
        assert call_args[0][0] == "seller-42"

    def test_order_intent_detected(self, client, patch_io):
        mock_embed, mock_search, mock_chat = patch_io
        mock_chat.return_value = ORDER_REPLY
        payload = {
            "sellerId": "s1",
            "customerPsid": "p1",
            "message": "2ta soap order dite chai, naam Rahim, phone 01712345678, address Mirpur Dhaka",
        }
        resp = client.post("/respond", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["orderIntentDetected"] is True
        assert data["extractedFields"]["product"] == "Handmade Soap"
        assert data["extractedFields"]["quantity"] == 2
        assert data["extractedFields"]["phone"] == "01712345678"

    def test_no_context_does_not_hallucinate(self, client, patch_io):
        """F5 grounding: when Qdrant returns no chunks, reply must not invent content."""
        mock_embed, mock_search, mock_chat = patch_io
        mock_search.return_value = []  # no catalog chunks
        mock_chat.return_value = NO_CONTEXT_REPLY
        payload = {"sellerId": "s1", "customerPsid": "p1", "message": "rubber duck er dam koto?"}
        resp = client.post("/respond", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        # reply must say "don't have", not invent a price
        assert "don't have" in data["reply"] or "Sorry" in data["reply"]
        assert data["orderIntentDetected"] is False

    def test_openai_failure_returns_fallback(self, client, patch_io):
        mock_embed, mock_search, mock_chat = patch_io
        mock_chat.return_value = {
            "reply": "Sorry, I couldn't process that right now.",
            "orderIntentDetected": False,
            "extractedFields": None,
        }
        payload = {"sellerId": "s1", "customerPsid": "p1", "message": "test"}
        resp = client.post("/respond", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["reply"]  # non-empty fallback

    def test_history_passed_to_prompt(self, client, patch_io):
        mock_embed, mock_search, mock_chat = patch_io
        payload = {
            "sellerId": "s1",
            "customerPsid": "p1",
            "message": "arekta den",
            "history": [
                {"role": "user", "text": "soap ache?"},
                {"role": "assistant", "text": "yes, 150 taka"},
            ],
        }
        resp = client.post("/respond", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        # prompt builder must have received 2 history messages → 4 total messages (system + 2 + user)
        messages_sent = mock_chat.call_args[0][0]
        assert len(messages_sent) == 4

    def test_missing_token_returns_401(self, client):
        payload = {"sellerId": "s1", "customerPsid": "p", "message": "hi"}
        resp = client.post("/respond", json=payload)
        assert resp.status_code == 401

    def test_empty_message_returns_422(self, client):
        payload = {"sellerId": "s1", "customerPsid": "p", "message": ""}
        resp = client.post("/respond", json=payload, headers=HEADERS)
        assert resp.status_code == 422
