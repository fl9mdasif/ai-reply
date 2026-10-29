import os

import pytest
from fastapi.testclient import TestClient

# Set env vars before any src import so Pydantic BaseSettings picks them up.
# Use os.environ directly (not setdefault) so tests are always isolated.
TEST_INTERNAL_TOKEN = "test-internal-token-must-be-32-chars!"

os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["QDRANT_URL"] = "http://localhost:6333"
os.environ["QDRANT_API_KEY"] = ""
os.environ["RAG_ENGINE_INTERNAL_TOKEN"] = TEST_INTERNAL_TOKEN


@pytest.fixture(scope="session")
def app():
    # Clear lru_cache so tests use the env vars set above
    from src.config.settings import get_settings
    get_settings.cache_clear()

    from src.main import create_app
    return create_app()


@pytest.fixture(scope="session")
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def internal_token() -> str:
    return TEST_INTERNAL_TOKEN
