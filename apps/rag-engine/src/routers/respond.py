import structlog
from fastapi import APIRouter, Depends

from src.config.settings import get_settings
from src.lib.openai_client import chat, embed_texts
from src.lib.prompt_builder import build_messages
from src.lib.qdrant_client import search
from src.middleware.auth import verify_internal_token
from src.models.respond import ExtractedFields, RespondRequest, RespondResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/respond", tags=["respond"])


@router.post("", response_model=RespondResponse, dependencies=[Depends(verify_internal_token)])
async def respond(req: RespondRequest) -> RespondResponse:
    settings = get_settings()

    # Embed the customer query
    [query_vector] = await embed_texts([req.message])

    # Qdrant search — always filtered by sellerId (multi-tenant isolation)
    chunks = await search(req.sellerId, query_vector, top_k=settings.top_k)

    # Build prompt and call GPT-4o-mini
    messages = build_messages(chunks, req.history, req.message)
    result = await chat(messages)

    reply = result.get("reply") or "Sorry, I couldn't process that right now."
    order_intent = bool(result.get("orderIntentDetected", False))
    raw_fields = result.get("extractedFields")

    extracted = None
    if raw_fields and isinstance(raw_fields, dict):
        extracted = ExtractedFields(**{k: v for k, v in raw_fields.items() if k in ExtractedFields.model_fields})

    logger.info(
        "respond handled",
        seller_id=req.sellerId,
        psid=req.customerPsid,
        chunks_used=len(chunks),
        order_intent=order_intent,
    )

    return RespondResponse(
        reply=reply,
        orderIntentDetected=order_intent,
        extractedFields=extracted,
    )
