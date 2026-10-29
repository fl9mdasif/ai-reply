from pydantic import BaseModel, Field


class FaqEntry(BaseModel):
    question: str
    answer: str


class EmbedRequest(BaseModel):
    sellerId: str = Field(..., min_length=1)
    productId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str | None = None
    faqEntries: list[FaqEntry] = []


class EmbedResponse(BaseModel):
    chunksEmbedded: int
