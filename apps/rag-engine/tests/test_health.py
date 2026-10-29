"""RE-M0-7: health endpoint + auth middleware smoke tests."""
from fastapi import Depends
from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200


def test_health_body(client: TestClient) -> None:
    data = client.get("/health").json()
    assert data["status"] == "ok"
    assert data["service"] == "rag-engine"


def test_health_requires_no_auth(client: TestClient) -> None:
    # /health must be reachable without any token
    response = client.get("/health")
    assert response.status_code == 200


def test_protected_route_without_token_returns_401(internal_token: str) -> None:
    """Verify the auth dependency rejects missing tokens."""
    from fastapi import FastAPI
    from src.middleware.auth import verify_internal_token

    mini = FastAPI()

    @mini.get("/ping", dependencies=[Depends(verify_internal_token)])
    async def ping() -> dict:
        return {"ping": "pong"}

    with TestClient(mini) as tc:
        assert tc.get("/ping").status_code == 401


def test_protected_route_wrong_token_returns_401(internal_token: str) -> None:
    from fastapi import FastAPI
    from src.middleware.auth import verify_internal_token

    mini = FastAPI()

    @mini.get("/ping", dependencies=[Depends(verify_internal_token)])
    async def ping() -> dict:
        return {"ping": "pong"}

    with TestClient(mini) as tc:
        assert tc.get("/ping", headers={"X-Internal-Token": "wrong-token"}).status_code == 401


def test_protected_route_correct_token_returns_200(internal_token: str) -> None:
    from fastapi import FastAPI
    from src.middleware.auth import verify_internal_token

    mini = FastAPI()

    @mini.get("/ping", dependencies=[Depends(verify_internal_token)])
    async def ping() -> dict:
        return {"ping": "pong"}

    with TestClient(mini) as tc:
        r = tc.get("/ping", headers={"X-Internal-Token": internal_token})
        assert r.status_code == 200
        assert r.json() == {"ping": "pong"}
