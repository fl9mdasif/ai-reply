import structlog
from fastapi import APIRouter, Depends, Query

from src.lib.chunker import chunk_product
from src.lib.openai_client import embed_texts
from src.lib.qdrant_client import delete_by_product, upsert_vectors
from src.middleware.auth import verify_internal_token
from src.models.embed import EmbedRequest, EmbedResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/embed", tags=["embed"])


@router.post("", response_model=EmbedResponse, dependencies=[Depends(verify_internal_token)])
async def embed_product(req: EmbedRequest) -> EmbedResponse:
    chunks = chunk_product(req)
    vectors = await embed_texts(chunks)
    await upsert_vectors(req.sellerId, req.productId, chunks, vectors)
    logger.info("product embedded", seller_id=req.sellerId, product_id=req.productId, chunks=len(chunks))
    return EmbedResponse(chunksEmbedded=len(chunks))


@router.delete("/{product_id}", status_code=204, dependencies=[Depends(verify_internal_token)])
async def delete_product_embeddings(
    product_id: str,
    sellerId: str = Query(..., min_length=1),
) -> None:
    await delete_by_product(sellerId, product_id)
    logger.info("product embeddings deleted", seller_id=sellerId, product_id=product_id)
