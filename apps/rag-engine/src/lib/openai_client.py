import json

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


async def chat(messages: list[dict]) -> dict:
    """Call GPT-4o-mini with JSON mode. Returns parsed dict with keys:
    reply, orderIntentDetected, extractedFields.

    Falls back to a safe dict on any parse failure so the caller always
    gets a valid shape.
    """
    settings = get_settings()
    client = get_openai_client()

    response = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    raw = response.choices[0].message.content or "{}"
    logger.debug("chat response", model=settings.openai_chat_model, tokens=response.usage.total_tokens if response.usage else None)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("chat response not valid JSON", raw=raw[:200])
        return {
            "reply": "Sorry, I couldn't process that right now.",
            "orderIntentDetected": False,
            "extractedFields": None,
        }
