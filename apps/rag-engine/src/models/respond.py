from pydantic import BaseModel, Field


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    text: str


class RespondRequest(BaseModel):
    sellerId: str = Field(..., min_length=1)
    customerPsid: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    history: list[HistoryMessage] = []


class ExtractedFields(BaseModel):
    product: str | None = None
    quantity: int | None = None
    customerName: str | None = None
    phone: str | None = None
    address: str | None = None


class RespondResponse(BaseModel):
    reply: str
    orderIntentDetected: bool
    extractedFields: ExtractedFields | None = None
