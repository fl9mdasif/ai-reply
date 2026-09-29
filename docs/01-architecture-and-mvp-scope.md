# jobabai.com: MVP Scope and Architecture

## 1. What the MVP does, restated precisely

A seller connects their Facebook Page to jobabai. A customer messages the Page asking about a product. jobabai answers from that seller's own product catalog (RAG, retrieval-augmented generation, not a generic chatbot). If the customer wants to order, jobabai collects the order details in a structured way, screens it for COD (cash-on-delivery) risk patterns, and logs it to that seller's own Google Sheet. That's the whole MVP. No WhatsApp, no Instagram, no custom dashboard yet, those are later phases (see `jobabai-launch-roadmap.md` for the full phase breakdown).

## 2. Why a hybrid stack, not one language everywhere

You already have a proven Express + TypeScript + MongoDB + Zod stack from HydraaZone, the IT agency site, and the inventory system, that convention is documented in your `SERVER-ARCHITECTURE.md` and it works. Rewriting the whole product in Django would mean leaving that behind for the 80% of the app that has nothing to do with AI (auth, seller accounts, product catalog CRUD, webhooks, the Google Sheets integration).

The 20% that IS AI-specific (the RAG pipeline: chunking product catalogs, embedding them, retrieving relevant chunks, calling the LLM) is where Python genuinely has the better tooling (LangChain or a lighter custom pipeline, mature OpenAI SDK patterns, easy vector-DB clients). So: keep that slice in a small, separate Python service, and let it stay small on purpose.

```
                         ┌─────────────────────────┐
                         │   Meta Webhooks          │
                         │   (Messenger, later WA)  │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────┐
                    │   Node/Express API (main app)     │
                    │   - webhook receiver               │
                    │   - seller auth & accounts          │
                    │   - product catalog CRUD            │
                    │   - order logging → Google Sheets   │
                    │   - calls the AI service below      │
                    └────────────┬───────────────────────┘
                                 │  internal HTTP call
                                 ▼
                    ┌──────────────────────────────────┐
                    │   Python/FastAPI AI service        │
                    │   - embed & store product catalog   │
                    │   - retrieve relevant chunks (RAG)  │
                    │   - call OpenAI, return the reply   │
                    │   - COD risk-flag scoring            │
                    └────────────┬───────────────────────┘
                                 │
                    ┌────────────┴───────────────┐
                    ▼                             ▼
            ┌───────────────┐           ┌──────────────────┐
            │  MongoDB Atlas │           │  Qdrant (vectors) │
            │  (sellers,     │           │  (product catalog  │
            │   orders,      │           │   embeddings)      │
            │   conversations)│          └──────────────────┘
            └───────────────┘
```

Both services deploy as two small Railway services inside one Railway project, they talk to each other over Railway's internal networking, so the AI service is never exposed to the public internet directly, only the Node API is.

## 3. Module breakdown (Node/Express side, following your existing conventions)

| Module | Responsibility |
|---|---|
| `auth` | Seller signup/login, session/JWT, later: staff roles if you add a team |
| `seller` | Seller profile, connected Facebook Page, plan/tier |
| `catalog` | Product catalog CRUD (name, price, description, FAQ entries), triggers re-embedding in the AI service when changed |
| `webhook` | Receives Meta Messenger webhook events, verifies the signature, hands the message to the AI service, sends the reply back via the Messenger Send API |
| `order` | Structured order record (from a confirmed COD flow), writes a row to the seller's Google Sheet via the Sheets API, stores a copy in MongoDB too so you have your own record independent of Sheets |
| `sheets-integration` | One-time OAuth connection per seller to their Google account, holds the refresh token, appends rows |

## 4. Module breakdown (Python/FastAPI AI service)

| Module | Responsibility |
|---|---|
| `embed` | Chunk a seller's product catalog text, generate embeddings, upsert into that seller's namespace in Qdrant (one Qdrant collection, partitioned by `seller_id`, not one collection per seller, keeps ops simple at this scale) |
| `retrieve` | Given an incoming customer question, embed it, query Qdrant for the top-k relevant chunks scoped to that seller |
| `respond` | Build the prompt (system instructions + retrieved chunks + conversation history) and call OpenAI, return the reply text |
| `risk-score` | Given a structured order (phone, address, product, quantity), apply simple rule-based risk flags first (repeat cancellations if you're tracking that, obviously malformed phone numbers, mismatched delivery area). Don't reach for an ML model for this at MVP stage, rules cover the obvious cases and are explainable to a seller who asks "why was this flagged" |

## 5. Data model notes

- Multi-tenant from day one: every collection (`products`, `orders`, `conversations`) carries a `sellerId`. Retrofitting this later, after your first pilot's data already exists without it, is real rework, so it's worth the small extra discipline now even with one pilot seller.
- Keep conversation history short-lived and scoped: you don't need to store every message forever for the MVP, a rolling window (last N messages) per conversation is enough context for the AI service and keeps storage/cost down.

## 6. What is deliberately NOT in the MVP

- No custom seller dashboard (Google Sheets is the interim dashboard, see `jobabai-launch-roadmap.md` Phase 4)
- No WhatsApp or Instagram integration yet (Phase 3)
- No self-serve signup flow, you'll onboard your first 2 to 4 pilots by hand
- No automated billing (manual bKash/Nagad collection, see the launch roadmap's payment section)
- No fine-tuned or self-hosted model, OpenAI's API is the whole AI layer for now
