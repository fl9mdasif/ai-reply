from src.models.respond import HistoryMessage

SYSTEM_PROMPT = """You are a helpful customer service assistant for an online shop.

Rules you must follow without exception:
1. Answer ONLY from the catalog context provided below.
2. NEVER invent prices, product names, or details not present in the context.
3. If the answer is not in the context, say honestly: "Sorry, I don't have that information right now."
4. When a customer wants to place an order, detect the intent and extract: product name, quantity, customer name, phone number, delivery address.
5. Reply in the same language the customer uses (Bengali or English).
6. Keep replies concise and friendly.

Respond in JSON with this exact structure:
{
  "reply": "<your reply to the customer>",
  "orderIntentDetected": <true|false>,
  "extractedFields": {
    "product": "<product name or null>",
    "quantity": <number or null>,
    "customerName": "<name or null>",
    "phone": "<phone or null>",
    "address": "<address or null>"
  }
}"""


def build_messages(
    context_chunks: list[str],
    history: list[HistoryMessage],
    customer_message: str,
) -> list[dict]:
    context_block = (
        "\n---\n".join(context_chunks)
        if context_chunks
        else "No catalog context available."
    )

    system_with_context = f"{SYSTEM_PROMPT}\n\n## Catalog Context\n{context_block}"

    messages: list[dict] = [{"role": "system", "content": system_with_context}]

    for msg in history:
        role = "assistant" if msg.role == "assistant" else "user"
        messages.append({"role": role, "content": msg.text})

    messages.append({"role": "user", "content": customer_message})
    return messages
