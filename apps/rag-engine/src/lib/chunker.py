from src.models.embed import EmbedRequest


def chunk_product(req: EmbedRequest) -> list[str]:
    """Paragraph-level chunker for a catalog product.

    Strategy: one chunk per meaningful unit of text so that each Qdrant
    point covers a focused piece of information.  Catalog sizes are small,
    so simple splitting is enough.
    """
    chunks: list[str] = []

    # Chunk 1: product name + price hint (always present)
    chunks.append(f"Product: {req.name}")

    # Chunk 2: description (if present, split on double-newlines)
    if req.description:
        paragraphs = [p.strip() for p in req.description.split("\n\n") if p.strip()]
        if paragraphs:
            chunks.extend(paragraphs)
        else:
            chunks.append(req.description.strip())

    # One chunk per FAQ entry (question + answer together for best retrieval)
    for entry in req.faqEntries:
        chunks.append(f"Q: {entry.question}\nA: {entry.answer}")

    return [c for c in chunks if c]
