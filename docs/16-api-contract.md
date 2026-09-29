# jobabai.com: API Contract

The second bonus doc. Endpoint-by-endpoint reference for both services. `jobabai-core-api` is public-facing (JWT or Meta-signature authenticated), `jobabai-rag-engine` is internal-only (shared-secret authenticated, unreachable from outside per `15-security.md`).

## jobabai-core-api (Node/Express, public)

### Auth

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/auth/register` | None | `{ businessName, email, password }` | `{ token, sellerId }` |
| POST | `/auth/login` | None | `{ email, password }` | `{ token, sellerId }` |

### Seller

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/seller/me` | JWT | none | `{ sellerId, businessName, facebookPageId, googleSheetConnected }` |
| POST | `/seller/connect-facebook` | JWT | `{ pageId, pageAccessToken }` (from Meta OAuth flow) | `{ success }` |
| POST | `/seller/connect-sheets` | JWT | Google OAuth callback params | `{ success, googleSheetId }` |

### Catalog

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/catalog` | JWT | none | `{ products: [...] }`, scoped to `sellerId` |
| POST | `/catalog` | JWT | `{ name, price, description, faqEntries[] }` | `{ productId }`, triggers `jobabai-rag-engine /embed` |
| PUT | `/catalog/:productId` | JWT | same shape as POST | `{ success }`, triggers `jobabai-rag-engine /embed` |
| DELETE | `/catalog/:productId` | JWT | none | `{ success }`, triggers vector removal in Qdrant |

### Webhook

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/webhook/messenger` | Meta verify token | Meta's challenge query params | echoes the challenge (Meta's handshake requirement) |
| POST | `/webhook/messenger` | `X-Hub-Signature-256` | Meta's messaging event payload | 200 always (Meta retries on non-200), internally triggers the respond/order flow |

### Orders

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/orders` | JWT | optional `?status=` filter | `{ orders: [...] }`, scoped to `sellerId` |
| GET | `/orders/:orderId` | JWT | none | full order record, only if it belongs to the authenticated `sellerId` |

## jobabai-rag-engine (Python/FastAPI, internal only)

Every endpoint below requires the `X-Internal-Token` header matching `RAG_ENGINE_INTERNAL_TOKEN`, and is only reachable over Railway's private network per `15-security.md` section 3.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | none | `{ status: "ok" }` |
| POST | `/embed` | `{ sellerId, productId, name, description, faqEntries[] }` | `{ chunksEmbedded }` |
| DELETE | `/embed/:productId` | `{ sellerId }` (query param or body) | `{ success }`, removes that product's vectors from Qdrant |
| POST | `/respond` | `{ sellerId, customerPsid, message, history[] }` | `{ reply, orderIntentDetected, extractedFields? }` |
| POST | `/risk-score` | `{ sellerId, product, quantity, customerName, phone, address }` | `{ riskFlags[], riskScore, explanations[] }` |

## Shape conventions

- All requests and responses are JSON
- Every `jobabai-rag-engine` request includes `sellerId`, every response payload from `jobabai-rag-engine` implicitly trusts the caller (`jobabai-core-api`) to have already authenticated the seller, `jobabai-rag-engine` itself does not re-check seller identity, only the shared-secret header
- Timestamps are ISO 8601 strings
- Error responses follow one shape across both services: `{ error: { code, message } }`, no internal stack traces or details exposed to any client, including internally between the two services (log the detail, return the generic shape)

## Source of truth

This file is the reference during build, but FastAPI also generates live OpenAPI docs at `/docs` in staging (disabled in production per `15-security.md`), useful for catching drift between this doc and the actual implementation, worth a periodic check rather than assuming this file stays perfectly in sync by hand.
