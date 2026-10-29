"""Tests for POST /embed and DELETE /embed/{productId}.

All external I/O (OpenAI, Qdrant) is patched so the suite runs without
network access or API keys beyond the test token set in conftest.py.
"""
from unittest.mock import AsyncMock, patch

import pytest

TOKEN = "test-internal-token-must-be-32-chars!"
HEADERS = {"X-Internal-Token": TOKEN}

FAKE_VECTOR = [0.1] * 1536


@pytest.fixture(autouse=True)
def patch_io():
    """Patch both OpenAI embed_texts and Qdrant upsert/delete for every test."""
    with (
        patch("src.routers.embed.embed_texts", new_callable=AsyncMock) as mock_embed,
        patch("src.routers.embed.upsert_vectors", new_callable=AsyncMock) as mock_upsert,
        patch("src.routers.embed.delete_by_product", new_callable=AsyncMock) as mock_delete,
    ):
        # Default: one vector per call, enough for the chunker output
        mock_embed.side_effect = lambda texts: [FAKE_VECTOR[:] for _ in texts]
        yield mock_embed, mock_upsert, mock_delete


class TestEmbedPost:
    def test_happy_path_name_and_description(self, client, patch_io):
        mock_embed, mock_upsert, _ = patch_io
        payload = {
            "sellerId": "seller-1",
            "productId": "prod-1",
            "name": "Handmade Soap",
            "description": "Natural ingredients.\n\nVegan formula.",
        }
        resp = client.post("/embed", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        # name chunk + 2 description paragraphs = 3 chunks
        assert data["chunksEmbedded"] == 3
        mock_embed.assert_awaited_once()
        mock_upsert.assert_awaited_once()

    def test_name_only_no_description(self, client, patch_io):
        mock_embed, mock_upsert, _ = patch_io
        payload = {"sellerId": "s1", "productId": "p1", "name": "Plain Product"}
        resp = client.post("/embed", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["chunksEmbedded"] == 1

    def test_faq_only_no_description(self, client, patch_io):
        mock_embed, mock_upsert, _ = patch_io
        payload = {
            "sellerId": "s1",
            "productId": "p2",
            "name": "Widget",
            "faqEntries": [
                {"question": "Delivery time?", "answer": "3-5 days"},
                {"question": "Return policy?", "answer": "7 days"},
            ],
        }
        resp = client.post("/embed", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        # 1 name chunk + 2 FAQ chunks = 3
        assert resp.json()["chunksEmbedded"] == 3

    def test_name_description_and_faq(self, client, patch_io):
        mock_embed, mock_upsert, _ = patch_io
        payload = {
            "sellerId": "s1",
            "productId": "p3",
            "name": "Full Product",
            "description": "Good product.",
            "faqEntries": [{"question": "Cheap?", "answer": "Yes"}],
        }
        resp = client.post("/embed", json=payload, headers=HEADERS)
        assert resp.status_code == 200
        # 1 name + 1 description + 1 FAQ = 3
        assert resp.json()["chunksEmbedded"] == 3

    def test_missing_token_returns_401(self, client):
        payload = {"sellerId": "s1", "productId": "p1", "name": "x"}
        resp = client.post("/embed", json=payload)
        assert resp.status_code == 401

    def test_wrong_token_returns_401(self, client):
        payload = {"sellerId": "s1", "productId": "p1", "name": "x"}
        resp = client.post("/embed", json=payload, headers={"X-Internal-Token": "wrong"})
        assert resp.status_code == 401

    def test_missing_seller_id_returns_422(self, client):
        payload = {"productId": "p1", "name": "x"}
        resp = client.post("/embed", json=payload, headers=HEADERS)
        assert resp.status_code == 422

    def test_empty_seller_id_returns_422(self, client):
        payload = {"sellerId": "", "productId": "p1", "name": "x"}
        resp = client.post("/embed", json=payload, headers=HEADERS)
        assert resp.status_code == 422


class TestEmbedDelete:
    def test_delete_calls_qdrant(self, client, patch_io):
        _, _, mock_delete = patch_io
        resp = client.delete("/embed/prod-1?sellerId=seller-1", headers=HEADERS)
        assert resp.status_code == 204
        mock_delete.assert_awaited_once_with("seller-1", "prod-1")

    def test_delete_missing_seller_id_returns_422(self, client):
        resp = client.delete("/embed/prod-1", headers=HEADERS)
        assert resp.status_code == 422

    def test_delete_missing_token_returns_401(self, client):
        resp = client.delete("/embed/prod-1?sellerId=s1")
        assert resp.status_code == 401
