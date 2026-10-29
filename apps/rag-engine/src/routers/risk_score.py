import structlog
from fastapi import APIRouter, Depends

from src.lib.risk_rules import evaluate
from src.middleware.auth import verify_internal_token
from src.models.risk_score import RiskScoreRequest, RiskScoreResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/risk-score", tags=["risk-score"])


@router.post("", response_model=RiskScoreResponse, dependencies=[Depends(verify_internal_token)])
async def risk_score(req: RiskScoreRequest) -> RiskScoreResponse:
    flags, score = evaluate(req)
    logger.info(
        "risk score computed",
        seller_id=req.sellerId,
        flags=[f.code for f in flags],
        score=score,
    )
    return RiskScoreResponse(riskFlags=flags, riskScore=score)
