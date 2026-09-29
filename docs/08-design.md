# jobabai.com: Technical Design (Deep Dive)

The deep-dive layer under `01-architecture-and-mvp-scope.md`'s high-level design. Data model, API shapes, caching, retry logic, and the RAG pipeline itself.

## 1. Data model (MongoDB Atlas)

Every collection carries `sellerId` from day one, no exceptions, retrofitting multi-tenancy after real pilot data exists is the kind of rework worth avoiding up front.

```
sellers
  _id, businessName, email, passwordHash, facebookPageId,
  facebookPageAccessToken (encrypted at rest), googleSheetId,
  googleOAuthRefreshToken (encrypted at rest), createdAt

products               (sellerId indexed)
  _id, sellerId, name, price, description, faqEntries[], updatedAt

conversations           (sellerId + customerPsid compound index)
  _id, sellerId, customerPsid (Messenger user id), messages[] (rolling
  window, last N only, see note below), lastActivityAt

orders                  (sellerId indexed)
  _id, sellerId, customerPsid, product, quantity, customerName,
  phone, address, riskFlags[], riskScore, status (pending/confirmed/
  cancelled), sheetRowWritten (bool), createdAt
```

Conversation history is kept short-lived on purpose: a rolling window of the last 10 to 15 messages per conversation is enough context for a grounded reply and keeps both storage and per-request OpenAI token cost down. Full history is not needed for the MVP's support use case.

## 2. API endpoint design

Full endpoint-by-endpoint reference lives in `16-api-contract.md`. The shape at a glance:

- **Node/Express (`jobabai-core-api`), public**: REST, JSON, JWT-authenticated for seller-facing routes, signature-verified for the Meta webhook route
- **Python/FastAPI (`jobabai-rag-engine`), internal only**: REST, JSON, shared-secret header authenticated, reachable only over Railway's private network, never exposed publicly

## 3. The RAG pipeline, step by step

```
Catalog change (seller edits a product)
  → jobabai-core-api's catalog module calls jobabai-rag-engine POST /embed
  → jobabai-rag-engine chunks the product text (name + description + FAQ,
    simple paragraph-level chunking is enough at catalog sizes this
    small, no need for a sophisticated splitter yet)
  → embeds each chunk (OpenAI embeddings API)
  → upserts to Qdrant, payload includes sellerId and productId

Customer question arrives
  → jobabai-core-api's webhook module calls jobabai-rag-engine POST /respond
  → jobabai-rag-engine embeds the question
  → queries Qdrant, filtered to that sellerId, top-k (k=4 is a
    reasonable starting point) most relevant chunks
  → builds a prompt: system instructions (answer only from the
    provided context, say so honestly if the answer isn't in the
    catalog) + retrieved chunks + recent conversation history +
    the question
  → calls OpenAI (GPT-4o-mini), returns the reply text plus a
    simple order-intent flag (a lightweight classification the
    prompt itself can return alongside the reply, no separate model
    call needed)
```

The "answer only from the provided context, say so honestly if you don't know" instruction is the single most important line in the system prompt, it is what keeps jobabai from inventing prices or policies (requirement F5 in `05-scope.md`).

## 4. Caching strategy

Minimal for the MVP, and deliberately so:

- No response caching for AI replies, every customer question is contextual (conversation history), caching would mostly miss
- Catalog embeddings themselves ARE the cache, in effect, re-embedding only happens on catalog change, not per question, which is the expensive-operation-avoided that matters here
- If OpenAI cost or latency becomes a real concern later, a cache keyed on (sellerId, normalized question) for exact-repeat FAQ questions is the natural next step, not needed at pilot volume

## 5. Queue and event design

No message queue for the MVP. The webhook path is synchronous request/response end to end (Meta webhook in, reply out, same request cycle). This is a deliberate simplicity choice for pilot-scale volume (see `14-scale-and-reliability.md` for when this stops being true). The one place a queue would help first, if volume grows, is catalog re-embedding on bulk catalog uploads, not the live customer-facing path.

## 6. Error handling and retry logic

- `jobabai-core-api` to `jobabai-rag-engine` calls: 8 second timeout, one retry with exponential backoff, then fall back to a generic reply (see `06-server-architecture.md` section 4)
- `jobabai-rag-engine` to OpenAI: the OpenAI SDK's own retry handling for transient errors (429, 5xx), plus a hard timeout so one slow call cannot hang the whole request
- `jobabai-rag-engine` to Qdrant: if the vector query fails, fall back to a reply built from the system prompt alone with an explicit "I don't have that information, let me get back to you" rather than a hallucinated answer, never silently drop the grounding requirement
- Google Sheets API write failures: retried once, if still failing the order is still saved to MongoDB (the source of truth) and flagged `sheetRowWritten: false` for a background retry job to pick up later, an order is never lost just because Sheets was briefly unavailable

## 7. Assumptions made explicit

- Pilot-scale volume (2 to 4 sellers, low thousands of exchanges/month) for all of the above, revisit at real scale per `14-scale-and-reliability.md`
- One Qdrant collection, partitioned by `sellerId` in the payload, not one collection per seller, simpler ops at this scale, standard practice for multi-tenant RAG at small scale
- Google Sheets, not a database table, is the seller-visible record for the MVP, by design (Phase 4 dashboard note in the launch roadmap)
