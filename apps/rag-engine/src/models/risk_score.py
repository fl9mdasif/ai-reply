from pydantic import BaseModel, Field


class RiskScoreRequest(BaseModel):
    sellerId: str = Field(..., min_length=1)
    product: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=1)
    customerName: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1)


class RiskFlag(BaseModel):
    code: str
    reason: str


class RiskScoreResponse(BaseModel):
    riskFlags: list[RiskFlag]
    riskScore: float  # flags / total_rules, 0.0–1.0
