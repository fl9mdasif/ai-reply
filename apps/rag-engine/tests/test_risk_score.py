"""Tests for POST /risk-score — no external deps, pure rule logic."""

import pytest

TOKEN = "test-internal-token-must-be-32-chars!"
HEADERS = {"X-Internal-Token": TOKEN}

CLEAN_ORDER = {
    "sellerId": "s1",
    "product": "Handmade Soap",
    "quantity": 2,
    "customerName": "Rahim Uddin",
    "phone": "01712345678",
    "address": "Dhaka, Mirpur-10, Block-B",
}


class TestRiskScorePost:
    def test_clean_order_no_flags(self, client):
        resp = client.post("/risk-score", json=CLEAN_ORDER, headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["riskFlags"] == []
        assert data["riskScore"] == 0.0

    def test_valid_bd_phone_passes(self, client):
        for phone in ["01312345678", "01512345678", "01912345678"]:
            order = {**CLEAN_ORDER, "phone": phone}
            resp = client.post("/risk-score", json=order, headers=HEADERS)
            codes = [f["code"] for f in resp.json()["riskFlags"]]
            assert "malformed_phone" not in codes, f"Phone {phone} should be valid"

    def test_malformed_phone_flagged(self, client):
        for phone in ["0112345678", "0212345678", "abc", "1234"]:
            order = {**CLEAN_ORDER, "phone": phone}
            resp = client.post("/risk-score", json=order, headers=HEADERS)
            codes = [f["code"] for f in resp.json()["riskFlags"]]
            assert "malformed_phone" in codes, f"Phone {phone} should be flagged"

    def test_high_quantity_flagged(self, client):
        order = {**CLEAN_ORDER, "quantity": 11}
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        codes = [f["code"] for f in resp.json()["riskFlags"]]
        assert "high_quantity" in codes

    def test_boundary_quantity_10_not_flagged(self, client):
        order = {**CLEAN_ORDER, "quantity": 10}
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        codes = [f["code"] for f in resp.json()["riskFlags"]]
        assert "high_quantity" not in codes

    def test_suspicious_address_flagged(self, client):
        order = {**CLEAN_ORDER, "address": "Dhaka"}  # only 1 word
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        codes = [f["code"] for f in resp.json()["riskFlags"]]
        assert "suspicious_address" in codes

    def test_two_word_address_flagged(self, client):
        order = {**CLEAN_ORDER, "address": "Dhaka Mirpur"}  # 2 words, still vague
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        codes = [f["code"] for f in resp.json()["riskFlags"]]
        assert "suspicious_address" in codes

    def test_three_word_address_passes(self, client):
        order = {**CLEAN_ORDER, "address": "Dhaka Mirpur 10"}
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        codes = [f["code"] for f in resp.json()["riskFlags"]]
        assert "suspicious_address" not in codes

    def test_all_flags_max_score(self, client):
        order = {**CLEAN_ORDER, "phone": "0112345678", "quantity": 15, "address": "Dhaka"}
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        data = resp.json()
        assert len(data["riskFlags"]) == 3
        assert data["riskScore"] == 1.0

    def test_risk_flags_have_reason(self, client):
        order = {**CLEAN_ORDER, "phone": "bad"}
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        for flag in resp.json()["riskFlags"]:
            assert flag["reason"]

    def test_missing_token_returns_401(self, client):
        resp = client.post("/risk-score", json=CLEAN_ORDER)
        assert resp.status_code == 401

    def test_missing_field_returns_422(self, client):
        order = {k: v for k, v in CLEAN_ORDER.items() if k != "phone"}
        resp = client.post("/risk-score", json=order, headers=HEADERS)
        assert resp.status_code == 422
