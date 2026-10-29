import structlog
from openai import AsyncOpenAI

from src.config.settings import get_settings

logger = structlog.get_logger()

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using OpenAI text-embedding-3-small.

    Returns one vector per input text, in the same order.
    Raises on API failure — caller is responsible for error handling.
    """
    settings = get_settings()
    client = get_openai_client()

    response = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=texts,
    )

    # Response items are sorted by index per OpenAI spec
    vectors = [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
    logger.debug("embedded texts", count=len(texts), model=settings.openai_embedding_model)
    return vectors
