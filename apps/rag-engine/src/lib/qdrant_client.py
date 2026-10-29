import uuid

import structlog
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from src.config.settings import get_settings

logger = structlog.get_logger()

# text-embedding-3-small output dimension
VECTOR_SIZE = 1536

_client: AsyncQdrantClient | None = None


def get_qdrant_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
        )
    return _client


async def ensure_collection() -> None:
    """Create the Qdrant collection if it does not exist yet (idempotent)."""
    settings = get_settings()
    client = get_qdrant_client()
    collection_name = settings.qdrant_collection_name

    existing = await client.get_collections()
    names = [c.name for c in existing.collections]
    if collection_name not in names:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        logger.info("qdrant collection created", collection=collection_name)
    else:
        logger.debug("qdrant collection already exists", collection=collection_name)


async def upsert_vectors(
    seller_id: str,
    product_id: str,
    chunks: list[str],
    vectors: list[list[float]],
) -> None:
    """Upsert all chunks for one product. sellerId is stored as a payload field
    so every query can filter by it — the core multi-tenancy invariant."""
    settings = get_settings()
    client = get_qdrant_client()

    points = [
        PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{seller_id}:{product_id}:{i}")),
            vector=vector,
            payload={
                "sellerId": seller_id,
                "productId": product_id,
                "chunkIndex": i,
                "text": chunk,
            },
        )
        for i, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]

    await client.upsert(collection_name=settings.qdrant_collection_name, points=points)
    logger.info("vectors upserted", seller_id=seller_id, product_id=product_id, chunks=len(points))


async def delete_by_product(seller_id: str, product_id: str) -> None:
    """Delete all vectors for a specific product scoped to a seller."""
    settings = get_settings()
    client = get_qdrant_client()

    await client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector=Filter(
            must=[
                FieldCondition(key="sellerId", match=MatchValue(value=seller_id)),
                FieldCondition(key="productId", match=MatchValue(value=product_id)),
            ]
        ),
    )
    logger.info("vectors deleted", seller_id=seller_id, product_id=product_id)


async def search(
    seller_id: str,
    query_vector: list[float],
    top_k: int,
) -> list[str]:
    """Search for the top-k most relevant chunks for a seller.

    sellerId filter is ALWAYS applied — cross-seller queries are impossible.
    Returns chunk text strings only.
    """
    settings = get_settings()
    client = get_qdrant_client()

    results = await client.search(
        collection_name=settings.qdrant_collection_name,
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="sellerId", match=MatchValue(value=seller_id))]
        ),
        limit=top_k,
        with_payload=True,
    )

    return [str(hit.payload.get("text", "")) for hit in results if hit.payload]
