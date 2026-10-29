from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # OpenAI
    openai_api_key: str
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"

    # Qdrant
    qdrant_url: str
    qdrant_api_key: str = ""
    qdrant_collection_name: str = "jobabai"

    # Auth — shared secret with core-api
    rag_engine_internal_token: str

    # Server
    port: int = 8000
    log_level: str = "info"

    # RAG
    top_k: int = 4

    # Expose /docs only in staging
    enable_docs: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
