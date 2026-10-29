from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from src.config.settings import get_settings

_token_scheme = APIKeyHeader(name="X-Internal-Token", auto_error=False)


async def verify_internal_token(token: str | None = Security(_token_scheme)) -> None:
    """FastAPI dependency — validates X-Internal-Token on every protected route."""
    settings = get_settings()
    if not token or token != settings.rag_engine_internal_token:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Invalid or missing X-Internal-Token"},
        )
