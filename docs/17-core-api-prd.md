# jobabai.com: Core API PRD (jobabai-core-api)

Product requirements for the Node/Express service, the public half of jobabai. This is the document you build `apps/core-api` from. It sits on top of the decisions already made in `01-architecture-and-mvp-scope.md`, `05-scope.md`, `06-server-architecture.md`, `08-design.md`, `15-security.md` and `16-api-contract.md`, and it does not reopen them. Where this PRD adds detail or resolves a gap, it says so in Section 15 so the older docs can be patched.

Progress against this PRD is tracked in `PROGRESS.md` in the repo root. Every requirement ID in this document (for example `AUTH-3` or `ORD-7`) appears as a checkbox there.

## 1. Purpose and context

jobabai answers product questions for Bangladeshi f-commerce sellers on Facebook Messenger, using each seller's own catalog, and turns "I want to order" messages into risk-screened COD orders written to the seller's Google Sheet.

`jobabai-core-api` is the only public service. It owns everything except the AI work:

- Seller accounts, login and tenancy
- The product catalog and keeping the vector index in sync with it
- The Meta Messenger webhook and the reply loop
- The order conversation (collecting fields, confirming) and the order record
- The Google Sheets connection and row writes

It delegates all AI work (embedding, retrieval, answer generation, field extraction, risk scoring) to `jobabai-rag-engine` over the private network. The rag-engine is built later, so this service must be fully buildable and testable against a stub of it (Section 9).

## 2. Goals and non-goals

### Goals (MVP, Phase 1 and 2)

1. A seller can be onboarded by hand, connect a Facebook Page and a Google account, and manage a catalog through an authenticated API.
2. A customer message on the connected Page gets a grounded reply within 5 to 8 seconds.
3. An order-intent message runs a structured, confirmed order flow that ends in an order saved to MongoDB and appended to the seller's Sheet.
4. No seller can ever read or write another seller's data. This is a hard requirement, not a goal to approximate.
5. The service degrades safely: a failing rag-engine, Sheets or Qdrant never loses an order and never leaves a customer with no reply.

### Non-goals (explicitly not in this PRD)

WhatsApp and Instagram, a seller dashboard (the `jobabai-dashboard` app comes later and will consume this API), self-serve signup, billing, human handoff inbox, message queues, GraphQL, multi-user seller accounts or roles, refresh tokens, and any AI logic inside Node. Anything that comes up during the build and is not listed here goes into the Phase 3+ list in `PROGRESS.md`, not into the MVP.

## 3. Users and actors

| Actor | How they use the API |
|---|---|
| Seller (pilot) | Hand-onboarded. Logs in, connects Page and Google, manages the catalog, reads orders. Uses the API through Postman or a minimal script at first, the dashboard later. |
| Customer | Never touches the API directly. Messages the seller's Facebook Page. |
| Meta | Calls the webhook, expects fast `200` responses. |
| jobabai-rag-engine | Internal service called by core-api only. |
| Operator (you) | Reads logs, runs retries, suspends a seller, rotates secrets. |

## 4. Requirement summary

| ID | Requirement | Source | Priority |
|---|---|---|---|
| F1 | Seller can register and connect a Facebook Page | `05-scope.md` | Must |
| F2 | Seller can add, edit and remove catalog entries | `05-scope.md` | Must |
| F3 | Catalog change re-embeds within a few seconds | `05-scope.md` | Must |
| F4 | Incoming message triggers a grounded reply in a few seconds | `05-scope.md` | Must |
| F5 | Reply never invents product, price or policy | `05-scope.md` | Must (enforced in rag-engine, verified end to end here) |
| F6 | Order intent starts structured collection | `05-scope.md` | Must |
| F7 | Completed order is risk-scored and written to Sheet and Mongo | `05-scope.md` | Must |
| F8 | Every request and record is scoped by `sellerId` | `05-scope.md` | Must |

Priorities used below: **Must** blocks the MVP exit criteria, **Should** is built if time allows before the first pilot, **Could** is deferred without harm.

## 5. Technical stack and conventions

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js LTS, TypeScript `strict: true` | ESM or CJS, pick once in Task 2 and stay consistent |
| Framework | Express 5 | Async handlers can throw, no `express-async-errors` needed |
| Validation | Zod at every boundary | Request bodies, query, params and env |
| Database | MongoDB Atlas via the **native driver** | No Mongoose or Prisma, per `06-server-architecture.md` section 7 |
| Auth | JWT (HS256) in `Authorization: Bearer` | 7 day expiry, no refresh tokens in MVP |
| Password hashing | `bcryptjs`, cost 12 | Pure JS, no native build step on Railway |
| Logging | `pino` plus `pino-http` | JSON logs, request id on every line |
| Security middleware | `helmet`, `cors` (allowlist), `express-rate-limit` | See Section 8 |
| HTTP to other services | Node `fetch` with `AbortController` timeouts | No axios |
| Google | `google-auth-library` for OAuth, direct REST calls to the Sheets API | Avoids the very large `googleapis` package |
| Tests | Vitest, supertest, `mongodb-memory-server`, `msw` for outbound HTTP | See Section 12 |
| Lint and format | ESLint, Prettier | Run in CI and before every commit |

Conventions carried over from HydraaZone, the IT agency site and the inventory system:

- Module shape: `<module>.controller.ts`, `<module>.service.ts`, `<module>.routes.ts`, `<module>.schema.ts` (Zod). A repository file `<module>.repo.ts` is added per module so every Mongo call lives in one place (Section 8.1).
- Controllers parse input and shape output. Services hold business logic. Repos talk to Mongo. A module never imports another module's repo, only its exported service functions.
- One error shape everywhere: `{ "error": { "code": "...", "message": "..." } }` (Section 8.4).
- Typed errors thrown from services, one `error-handler` middleware last in the chain.
- All config through `config/env.ts`, validated at boot. The app refuses to start on a bad or missing variable.
- Money is stored as a number in BDT with no fractions for the MVP (`price` is a whole-taka integer). Revisit if sellers need paisa.
- Timestamps are `Date` in Mongo and ISO 8601 strings in JSON.
- Ids in JSON are strings (`ObjectId.toString()`), never raw ObjectId objects.

## 6. Architecture

### 6.1 Folder structure

```
apps/core-api/
  src/
    modules/
      auth/           controller, service, routes, schema, repo
      seller/
      catalog/
      webhook/
      conversation/   conversation state and order-draft logic (internal, no public routes)
      order/
      sheets-integration/
      health/
    lib/
      db.ts                   Mongo client, collection getters, index creation
      crypto.ts               AES-256-GCM encrypt/decrypt for tokens at rest
      rag-engine-client.ts    typed internal client with timeout, retry, fallback
      meta-client.ts          Messenger Send API and Graph API wrapper
      google-client.ts        OAuth token exchange and Sheets REST calls
      errors.ts               typed error classes
      logger.ts
    middleware/
      error-handler.ts
      auth-guard.ts           verifies JWT, loads seller, sets req.sellerId
      verify-meta-signature.ts
      rate-limiters.ts
      request-id.ts
    config/
      env.ts
    app.ts                    builds the Express app (no listen), used by tests
    server.ts                 connects Mongo, starts listening, handles shutdown
  tests/
    helpers/                  fake rag-engine, fake Meta, seed factories
  scripts/
    stub-rag-engine.ts        local dev stand-in for the Python service
  .env.example
  package.json
```

`app.ts` and `server.ts` are split on purpose: supertest imports `app.ts` without opening a port.

### 6.2 Dependency direction

```
webhook ──► conversation ──► order ──► sheets-integration
   │             │             │
   ├──► seller   ├──► catalog  └──► seller
   └──► (lib: rag-engine-client, meta-client)
auth ──► seller (creates the seller record)
```

No cycles. `webhook` is the only module that talks to Meta, `sheets-integration` is the only one that talks to Google, `rag-engine-client` is the only caller of the rag-engine.

### 6.3 Deployment shape

One Railway service `jobabai-core-api`, public domain, two environments (`staging`, `production`) auto-deployed from GitHub. Single instance in the MVP, so in-process timers are acceptable for the retry job (Section 11.4). If it is ever scaled to more than one instance, that job must move behind a lock or a real scheduler.

## 7. Configuration

All variables are validated in `config/env.ts`. `.env.example` lists every key with a placeholder, never a real value.

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT`, `LOG_LEVEL` | Runtime basics |
| `MONGODB_URI`, `MONGODB_DB_NAME` | Database |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Seller tokens (min 32 chars enforced) |
| `ENCRYPTION_KEY` | 32 bytes, base64. AES-256-GCM key for Page tokens and Google refresh tokens |
| `REGISTRATION_MODE` | `invite` (default) or `open`. In `invite` mode `/auth/register` requires `inviteCode` |
| `INVITE_CODE` | Shared code you give each pilot, required when mode is `invite` |
| `META_APP_SECRET` | Verifies `X-Hub-Signature-256` |
| `META_VERIFY_TOKEN` | Webhook handshake token, not guessable |
| `META_GRAPH_VERSION` | Graph API version, configurable so a deprecation is a config change |
| `RAG_ENGINE_URL` | Private Railway URL of the rag-engine |
| `RAG_ENGINE_INTERNAL_TOKEN` | Sent as `X-Internal-Token` |
| `RAG_ENGINE_TIMEOUT_MS` | Default 8000 |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Sheets OAuth |
| `CORS_ORIGINS` | Comma separated allowlist, empty means no browser origins allowed |
| `ENABLE_RETRY_JOB` | `true` on the single production instance |

Required vars are never given defaults that would make the app run in a half-configured state. Optional ones have a documented default.

## 8. Cross-cutting requirements

### 8.1 Seller isolation (F8, the non-negotiable)

- Every repo function for `products`, `conversations`, `orders` takes `sellerId` as a **required first argument** and includes it in the filter. There is no repo function that fetches by `_id` alone. This makes a missing filter a compile error instead of a code review catch.
- `auth-guard` sets `req.sellerId` from the verified JWT. Controllers read `req.sellerId` and never trust a `sellerId` in a body, query or path.
- A resource that exists but belongs to another seller returns **404, not 403**, so ids cannot be probed.
- An automated isolation suite (`tests/isolation.test.ts`) seeds two sellers and asserts, for every seller-scoped route, that seller A's token cannot read, update or delete seller B's data by guessing ids. Adding a new scoped route without adding it to this suite fails a meta test that lists registered routes.
- Webhook path: the seller is resolved from the Page id in the event, and every downstream call carries that `sellerId`.

### 8.2 Authentication and sessions

- Passwords: min 8 chars, hashed with bcrypt. Login errors never say which of email or password was wrong.
- JWT payload is `{ sub: sellerId }` plus standard claims. `auth-guard` loads the seller by id on each request and rejects suspended or deleted sellers with `401`. One indexed read per request is acceptable at this scale and gives instant suspension.
- Emails are lowercased and trimmed before storage and lookup. Unique index on `email`.

### 8.3 Secrets and encryption at rest

- Facebook Page access tokens and Google refresh tokens are encrypted with AES-256-GCM (`lib/crypto.ts`), stored as `iv.tag.ciphertext` base64, decrypted only at the moment of use.
- No secret, token, password or hash appears in a log line, an error response, or an API response. The logger has a redaction list for `authorization`, `password`, `pageAccessToken`, `refreshToken`.
- Customer phone numbers are logged masked (last 4 digits only).

### 8.4 Error model

Every error response is `{ "error": { "code": "<UPPER_SNAKE>", "message": "<human readable>" } }`. Validation errors add `details` (array of `{ path, message }`). Stack traces and internal messages are logged, never returned.

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod failure |
| 401 | `UNAUTHENTICATED` | Missing, invalid or expired token, suspended seller, bad webhook signature |
| 403 | `FORBIDDEN` | Wrong registration invite code |
| 404 | `NOT_FOUND` | Missing resource or resource owned by another seller |
| 409 | `CONFLICT` | Duplicate email, Page already connected to another seller |
| 429 | `RATE_LIMITED` | Rate limiter tripped |
| 502 | `UPSTREAM_ERROR` | Meta, Google or rag-engine failure on a seller-facing route |
| 500 | `INTERNAL_ERROR` | Anything unexpected |

The webhook route is the exception: it returns `200` for everything except a bad signature (`401`) and a failed handshake (`403`).

### 8.5 Rate limiting

| Target | Limit |
|---|---|
| `POST /auth/login` | 10 per 15 minutes per IP plus email |
| `POST /auth/register` | 5 per hour per IP |
| `POST /webhook/messenger` | 60 per minute per Page id, excess events are acknowledged with `200` and dropped with a warning log (protects OpenAI spend without triggering Meta retries) |
| All other routes | 300 per minute per IP |

### 8.6 Observability

- `pino-http` request log with `requestId`, method, path, status, duration, `sellerId` when known.
- Permanent log lines: every rag-engine call (endpoint, duration, outcome), every Meta send (status), every Sheets write (status), every webhook event outcome (`replied`, `deduped`, `ignored`, `failed`), and error logs with `sellerId` and endpoint.
- `GET /health` (liveness) and `GET /health/deps` (Mongo ping plus rag-engine `/health`).
- Graceful shutdown on `SIGTERM`: stop accepting, finish in-flight requests, close Mongo.
- Sentry is optional for the MVP and wired behind an env flag only if time allows (Could).

### 8.7 HTTP hygiene

`helmet` defaults, CORS allowlist from `CORS_ORIGINS`, JSON body limit 100 KB, `trust proxy` set for Railway so rate limiting sees real client IPs. The webhook route mounts `express.raw({ type: 'application/json' })` **before** any JSON parser, because the signature is computed over the raw bytes.

## 9. Data model

MongoDB collections. Every collection except `webhook_events` carries `sellerId`. Index creation runs at boot (`lib/db.ts`) and is idempotent.

### 9.1 `sellers`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | This is the `sellerId` everywhere else |
| `businessName` | string | 2 to 100 chars |
| `email` | string | Lowercased, unique |
| `passwordHash` | string | bcrypt |
| `status` | `active` or `suspended` | Default `active` |
| `plan` | string | `pilot` for now, display only |
| `facebookPageId` | string, optional | Unique sparse |
| `facebookPageName` | string, optional | From Graph API on connect |
| `facebookPageAccessToken` | string, optional | Encrypted |
| `webhookSubscribed` | boolean | True after the app is subscribed to the Page |
| `googleSheetId` | string, optional | |
| `googleSheetUrl` | string, optional | |
| `googleOAuthRefreshToken` | string, optional | Encrypted |
| `fallbackMessage` | string, optional | Sent when the AI is unavailable. Default in code, seller editable |
| `createdAt`, `updatedAt` | Date | |

Indexes: unique `email`, unique sparse `facebookPageId`.

### 9.2 `products`

`_id`, `sellerId`, `name`, `price` (integer BDT), `description`, `faqEntries[]` (`{ question, answer }`), `embedStatus` (`pending`, `synced`, `failed`), `embedError` (short string, optional), `createdAt`, `updatedAt`.

Indexes: `{ sellerId: 1, updatedAt: -1 }`, `{ sellerId: 1, nameLower: 1 }` (a lowercased copy of `name` for order-time matching).

### 9.3 `conversations`

`_id`, `sellerId`, `customerPsid`, `messages[]` (`{ role: 'customer' or 'assistant', text, ts }`, rolling window of the last 12), `state` (`idle`, `collecting_order`, `awaiting_confirmation`), `orderDraft` (`{ product, quantity, customerName, phone, address, phoneAttempts }`, optional), `stateUpdatedAt`, `lastActivityAt`.

Indexes: unique `{ sellerId: 1, customerPsid: 1 }`, TTL on `lastActivityAt` of 30 days so customer chat text does not live forever.

### 9.4 `orders`

| Field | Notes |
|---|---|
| `_id`, `sellerId`, `conversationId`, `customerPsid` | |
| `productName`, `productId` (optional) | `productId` set when the name matched a catalog entry |
| `unitPrice`, `total` | Optional, filled when the product matched |
| `quantity` | Integer, 1 to 100 |
| `customerName`, `phone`, `address` | `phone` stored normalized to `01XXXXXXXXX` when possible |
| `riskFlags[]` | `{ code, reason }`, human readable reason is mandatory |
| `riskScore` | Number as returned by the rag-engine, or `null` if scoring failed |
| `status` | `pending`, `confirmed`, `cancelled`. New orders start `pending` |
| `sheetRowWritten` | Boolean |
| `sheetWriteAttempts`, `sheetLastError` | Retry bookkeeping |
| `createdAt`, `updatedAt` | |

Indexes: `{ sellerId: 1, createdAt: -1 }`, `{ sellerId: 1, status: 1, createdAt: -1 }`, partial index on `{ sheetRowWritten: 1, sheetWriteAttempts: 1 }` where `sheetRowWritten` is false (for the retry job).

### 9.5 `webhook_events`

`mid` (Meta message id, unique), `pageId`, `createdAt`. TTL of 2 days. Used only to make Meta retries and duplicate deliveries harmless.

## 10. Module specifications

### 10.1 Health

| ID | Requirement | Priority |
|---|---|---|
| HLT-1 | `GET /health` returns `200 { status: "ok" }` with no dependencies touched | Must |
| HLT-2 | `GET /health/deps` returns `{ status, mongo, ragEngine }` and `503` if Mongo is down. A rag-engine failure reports `ragEngine: "down"` but does not fail the whole check | Must |

### 10.2 Auth

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/auth/register` | None | `{ businessName, email, password, inviteCode? }` | `201 { token, sellerId }` |
| POST | `/auth/login` | None | `{ email, password }` | `200 { token, sellerId }` |

| ID | Requirement | Priority |
|---|---|---|
| AUTH-1 | Register validates input, lowercases email, hashes password, creates the seller | Must |
| AUTH-2 | In `invite` mode a wrong or missing `inviteCode` returns `403 FORBIDDEN` | Must |
| AUTH-3 | Duplicate email returns `409 CONFLICT` | Must |
| AUTH-4 | Login returns a JWT; any failure returns the same `401` message | Must |
| AUTH-5 | `auth-guard` verifies the JWT, loads the seller, rejects suspended sellers, sets `req.sellerId` | Must |
| AUTH-6 | Login and register rate limits per Section 8.5 | Must |
| AUTH-7 | Passwords never appear in logs or responses | Must |

### 10.3 Seller

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/seller/me` | JWT | none | `{ sellerId, businessName, email, plan, facebookPageId, facebookPageName, googleSheetConnected, googleSheetUrl, fallbackMessage }` |
| PATCH | `/seller/me` | JWT | `{ businessName?, fallbackMessage? }` | updated profile |
| POST | `/seller/connect-facebook` | JWT | `{ pageId, pageAccessToken }` | `{ success, pageName }` |
| DELETE | `/seller/connect-facebook` | JWT | none | `{ success }` |
| GET | `/seller/connect-sheets/url` | JWT | none | `{ url }` (Google consent URL) |

| ID | Requirement | Priority |
|---|---|---|
| SEL-1 | `GET /seller/me` returns the profile with no secret fields | Must |
| SEL-2 | `connect-facebook` validates the token by calling the Graph API (`/{pageId}?fields=name`), rejects an invalid token with `400`, encrypts and stores the token, stores the page name | Must |
| SEL-3 | A Page id already connected to another seller returns `409` | Must |
| SEL-4 | After storing the token, subscribe the app to the Page (`POST /{pageId}/subscribed_apps` with `messages`) and set `webhookSubscribed`. If subscription fails, the connect still succeeds with `webhookSubscribed: false` and a warning in the response | Must |
| SEL-5 | `DELETE connect-facebook` unsubscribes best-effort and clears Page fields | Should |
| SEL-6 | `PATCH /seller/me` updates only the whitelisted fields | Should |
| SEL-7 | `connect-sheets/url` builds the Google consent URL with a signed `state` carrying `sellerId` (see 10.7) | Must |

The OAuth redirect that exchanges a Meta user token for a long-lived Page token is a dashboard concern. In the MVP you obtain the Page token by hand from the Meta developer tools for each pilot and submit it here (see open question Q1).

### 10.4 Catalog

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/catalog` | JWT | `?limit&cursor` | `{ products, nextCursor }` |
| GET | `/catalog/:productId` | JWT | none | product |
| POST | `/catalog` | JWT | `{ name, price, description?, faqEntries? }` | `201 { productId, embedStatus }` |
| PUT | `/catalog/:productId` | JWT | same shape as POST | `{ success, embedStatus }` |
| DELETE | `/catalog/:productId` | JWT | none | `{ success }` |
| POST | `/catalog/:productId/reembed` | JWT | none | `{ embedStatus }` |
| POST | `/catalog/import` | JWT | JSON array of products (max 200) | `{ created, failed[] }` |

| ID | Requirement | Priority |
|---|---|---|
| CAT-1 | Create, read, list, update, delete, all scoped by `sellerId` | Must |
| CAT-2 | Zod: `name` 1 to 120 chars required, `price` integer 0 to 10,000,000 required, `description` up to 2,000 chars, `faqEntries` up to 20 items with bounded text | Must |
| CAT-3 | After every create or update, call rag-engine `POST /embed`. The Mongo write happens first and is never rolled back by an embed failure | Must |
| CAT-4 | On embed success set `embedStatus: synced`. On failure set `failed`, store a short `embedError`, and still return success with `embedStatus: "failed"` so the seller is told | Must |
| CAT-5 | Delete removes the Mongo document, then calls rag-engine `DELETE /embed/:productId`. If vector removal fails, log at error level and leave a note in `PROGRESS.md` risks, because orphan vectors for a deleted product could be retrieved | Must |
| CAT-6 | `POST /reembed` retries a single failed product | Should |
| CAT-7 | `POST /catalog/import` accepts a JSON array so a pilot catalog can be loaded in one call, embedding each item with bounded concurrency (3) | Should |
| CAT-8 | List is paginated, default 50, max 100 | Must |
| CAT-9 | Each write keeps a lowercased `nameLower` for order-time matching | Must |

CSV upload is a dashboard concern. For the pilots, you convert their sheet to JSON once and call the import endpoint.

### 10.5 Webhook

| Method | Path | Auth | Behavior |
|---|---|---|---|
| GET | `/webhook/messenger` | Verify token | If `hub.mode=subscribe` and `hub.verify_token` matches, echo `hub.challenge` with `200`, else `403` |
| POST | `/webhook/messenger` | `X-Hub-Signature-256` | Verify, parse, process, always `200` after a valid signature |

#### Processing algorithm (per messaging event)

```
1. verify-meta-signature middleware: HMAC-SHA256 of the raw body with META_APP_SECRET,
   timing-safe compare. Invalid or missing: 401, nothing else runs.
2. Parse body. For each entry, for each messaging event:
3.   Ignore echoes (message.is_echo), delivery, read, and non-message events (log at debug).
4.   Dedupe: insert message.mid into webhook_events. Duplicate key: log "deduped", skip.
5.   Resolve seller by entry.id (Page id). Unknown Page or suspended seller: log, skip.
6.   Per-Page rate limit check. Over limit: log warning, skip.
7.   Non-text message (image, sticker, attachment only): send a short canned
     "text only" reply and skip the AI.
8.   Hand to conversation.service.handleCustomerMessage(sellerId, psid, text).
9.   Send the returned reply via meta-client.sendText(pageToken, psid, reply).
10.  Log outcome. Any exception is caught per event so one bad event never
     blocks the others or changes the HTTP status.
11. Respond 200.
```

| ID | Requirement | Priority |
|---|---|---|
| WH-1 | Handshake per above, verify token compared in constant time | Must |
| WH-2 | Signature verified over the raw body before any parsing; bad signature returns `401` | Must |
| WH-3 | Duplicate deliveries (same `mid`) are processed once | Must |
| WH-4 | Seller lookup by Page id; unknown or suspended Page is ignored with `200` | Must |
| WH-5 | The route returns `200` for every valid-signature request regardless of internal failure | Must |
| WH-6 | If the AI path fails, send the seller's `fallbackMessage` (or the default) so the customer is never left without a reply | Must |
| WH-7 | Sending uses the Send API with `messaging_type: RESPONSE`; a Meta send failure is logged with status and Meta's error code, never thrown | Must |
| WH-8 | Total processing budget per event is under 15 seconds (rag-engine 8s timeout with one retry is the worst case, see 11.1) | Must |
| WH-9 | Non-text messages get the canned reply and never reach the AI | Should |
| WH-10 | Optionally send `typing_on` before the AI call | Could |

Processing is synchronous within the request, per `06-server-architecture.md`. Duplicate protection (WH-3) is what makes a slow request and a Meta retry safe.

### 10.6 Conversation (internal)

Owns the per-customer state machine. No public routes.

| ID | Requirement | Priority |
|---|---|---|
| CONV-1 | `handleCustomerMessage(sellerId, psid, text)` upserts the conversation, appends the customer message to the rolling window (max 12), and returns the reply text | Must |
| CONV-2 | In `idle`, call rag-engine `/respond` with `{ sellerId, customerPsid, message, history }`. If `orderIntentDetected` is true, move to `collecting_order` and merge `extractedFields` into the draft | Must |
| CONV-3 | In `collecting_order`, call `/respond` to extract fields from the new message, merge non-null values into the draft (a message may contain several fields at once, F6), and never re-ask a field that is already filled | Must |
| CONV-4 | While fields are missing, the reply is a deterministic template listing only the missing fields (Bangla and English text kept in one constants file) rather than free AI text | Must |
| CONV-5 | Phone check: if the phone does not match the Bangladesh mobile format (`01[3-9]` plus 8 digits, optional `+880` or `880` prefix), ask once more; on the second bad value accept it and let risk scoring flag it (`phoneAttempts`) | Must |
| CONV-6 | When all five fields are present, move to `awaiting_confirmation` and reply with a summary (product, quantity, total if known, name, phone, address) and a clear "reply YES to confirm" | Must |
| CONV-7 | In `awaiting_confirmation`, a confirm keyword (small configurable list in English and Bangla) creates the order and returns to `idle`; a cancel keyword clears the draft; anything else is treated as a correction, re-extracted, and re-summarized | Must |
| CONV-8 | A draft untouched for 30 minutes is discarded the next time that customer writes | Must |
| CONV-9 | A cancel phrase at any point in the order flow clears the draft and says so | Should |
| CONV-10 | Assistant replies are appended to the rolling window | Must |
| CONV-11 | `history` sent to the rag-engine is the stored window only, never more | Must |

### 10.7 Sheets integration

| Method | Path | Auth | Behavior |
|---|---|---|---|
| GET | `/integrations/google/callback` | Signed `state` | Exchanges `code`, creates or links the Sheet, stores the refresh token, returns a small success HTML page |

| ID | Requirement | Priority |
|---|---|---|
| SHT-1 | Consent URL uses the minimum scope that lets the app create and append to its own spreadsheet (start with `drive.file`, verify it is sufficient during Task 9, widen only if proven necessary) | Must |
| SHT-2 | `state` is a short-lived signed token containing `sellerId`; callback rejects missing, expired or tampered state | Must |
| SHT-3 | Callback exchanges the code, stores the refresh token encrypted, creates a spreadsheet named "jobabai Orders" with a header row, stores `googleSheetId` and URL | Must |
| SHT-4 | `appendOrderRow(sellerId, order)` writes a row with columns: Date, Order ID, Product, Quantity, Total, Customer, Phone, Address, Risk Score, Risk Flags, Status | Must |
| SHT-5 | Access tokens are obtained from the refresh token on demand; a revoked or expired grant produces a typed `SheetsAuthError`, never a crash | Must |
| SHT-6 | Retried appends are idempotent: before re-appending an order that has prior attempts, look for its Order ID in column B and skip if present | Must |
| SHT-7 | Sheet writes have a 5 second timeout and one retry | Must |
| SHT-8 | Seller can disconnect Google (clears token and Sheet fields) | Could |

### 10.8 Orders

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/orders` | JWT | `?status&limit&cursor` | `{ orders, nextCursor }` |
| GET | `/orders/:orderId` | JWT | none | full order, only if owned |
| PATCH | `/orders/:orderId/status` | JWT | `{ status: "confirmed" or "cancelled" }` | updated order |
| POST | `/orders/:orderId/retry-sheet` | JWT | none | `{ sheetRowWritten }` |
| POST | `/orders/retry-sheets` | JWT | none | `{ attempted, succeeded }` |

#### `order.service.createFromDraft(sellerId, conversation)`

```
1. Normalize phone. Try to match productName to the catalog by nameLower
   (set productId, unitPrice, total when matched).
2. Call rag-engine POST /risk-score with a short timeout (fail-soft).
   Success: riskFlags and riskScore. Failure: riskFlags = [{ code: "risk_unavailable",
   reason: "Risk check could not run" }], riskScore = null.
3. Insert the order into MongoDB with status "pending" and sheetRowWritten false.
   This is the source of truth and must succeed before anything else.
4. If the seller has a Sheet connected, append the row. On success set
   sheetRowWritten true. On failure increment sheetWriteAttempts, store sheetLastError.
5. Return the order. The customer is told the order was received regardless of step 4.
```

| ID | Requirement | Priority |
|---|---|---|
| ORD-1 | Order creation follows the sequence above; steps 2 and 4 are fail-soft, step 3 is not | Must |
| ORD-2 | A risk-scoring failure never blocks or loses an order | Must |
| ORD-3 | A Sheets failure never loses an order and leaves `sheetRowWritten: false` | Must |
| ORD-4 | List and get are scoped by `sellerId`, list is paginated (default 50, max 100) and filterable by status | Must |
| ORD-5 | Every risk flag carries a human readable `reason` | Must |
| ORD-6 | `PATCH status` allows `pending` to `confirmed` or `cancelled` only, and records `updatedAt` (this status history is the data later repeat-cancellation rules need) | Should |
| ORD-7 | `retry-sheet` and `retry-sheets` re-attempt unwritten rows for the authenticated seller only | Must |
| ORD-8 | A background job (every 10 minutes, only when `ENABLE_RETRY_JOB=true`) retries orders with `sheetRowWritten: false` and fewer than 5 attempts, across sellers, one at a time | Should |
| ORD-9 | A seller with no Sheet connected still gets orders saved to Mongo; `sheetRowWritten` stays false and the retry job skips sellers without a Sheet | Must |
| ORD-10 | Quantity bounds 1 to 100; text fields length-bounded and trimmed | Must |

## 11. External integration contracts

### 11.1 rag-engine client

`lib/rag-engine-client.ts` is the only code that calls the Python service.

| Call | Method and path | Timeout | Failure behavior |
|---|---|---|---|
| `embed` | `POST /embed` | 8s, one retry | Throws `UpstreamError`; catalog marks `embedStatus: failed` |
| `removeEmbedding` | `DELETE /embed/:productId` | 8s, one retry | Throws; catalog logs error |
| `respond` | `POST /respond` | 8s, one retry with short backoff | Returns a typed failure; webhook uses the fallback message |
| `riskScore` | `POST /risk-score` | 4s, no retry | Returns a typed failure; order uses `risk_unavailable` |
| `health` | `GET /health` | 2s | Reported by `/health/deps` |

Every request sends `X-Internal-Token`. Every body includes `sellerId`. The client validates responses with Zod, so a rag-engine contract drift fails loudly in core-api tests instead of corrupting state.

### 11.2 Meta

- Send API: `POST https://graph.facebook.com/{META_GRAPH_VERSION}/me/messages` with the decrypted Page token.
- Page validation and subscription: `GET /{pageId}?fields=name`, `POST /{pageId}/subscribed_apps`.
- Page tokens are never logged. A `190` (invalid token) response from Meta marks the seller's connection unhealthy in logs so you can see it.

### 11.3 Google

- OAuth code exchange and refresh via `google-auth-library`.
- Sheets REST calls: create spreadsheet, append values, read column B for idempotency.
- Quota or 5xx errors are retried once, auth errors are surfaced as `SheetsAuthError`.

### 11.4 Retry job

A single `setInterval` started in `server.ts` when `ENABLE_RETRY_JOB=true`. Each tick selects at most 20 orders (oldest first) via the partial index, retries them sequentially, and logs a summary. It must never overlap itself (skip the tick if the previous one is still running).

## 12. Testing strategy

Follows `12-test-and-debug-strategy.md`. Test-first for new logic, Prove-It pattern for bugs.

| Layer | What | Tools |
|---|---|---|
| Unit | `verify-meta-signature`, `crypto` round trip, Zod schemas, phone normalization and validation, confirm/cancel keyword matching, draft merge logic, error mapping | Vitest |
| Integration | Every route through `app.ts` with a real in-memory Mongo; rag-engine, Meta and Google mocked at the HTTP boundary with `msw` | Vitest, supertest, mongodb-memory-server, msw |
| Isolation suite | Two sellers, every scoped route, cross-access returns 404 (Section 8.1) | Vitest |
| Failure injection | rag-engine timeout and 500 (fallback reply sent), embed failure (`embedStatus: failed`), risk failure (order saved with `risk_unavailable`), Sheets failure (order saved, `sheetRowWritten: false`, retry succeeds, no duplicate row), duplicate webhook `mid` | Vitest, msw |
| Contract | Responses from the real rag-engine validated against the Zod schemas in core-api once the Python service exists | Vitest, run against staging |
| E2E (manual) | The live flow from `05-scope.md` section 7, run by hand before every deploy | Phone, test Page |

Coverage target for the MVP is behavioral, not numeric: every requirement ID above has at least one test that names it. Minimum bar before a pilot: signature verification, isolation, order-failure paths, and the order state machine are fully covered.

## 13. Non-functional requirements

| Dimension | Target |
|---|---|
| Reply latency | p95 under 8s end to end (customer message to Send API call), dominated by OpenAI |
| Non-AI route latency | p95 under 300 ms at pilot load |
| Availability | Best effort, no SLA. Restart recovers fully (no in-memory state that matters, conversation and drafts live in Mongo) |
| Scale | 2 to 4 sellers, low thousands of exchanges per month |
| Data isolation | Hard requirement (Section 8.1) |
| Security | Everything in `15-security.md` sections 1, 2, 4, 5, 6, 7 applies to this service |
| Cost | Core API plus Mongo free tier fits inside the $20 to $50 per month ceiling |

## 14. Build order and milestones

Core-api is built first, against a stub rag-engine (`scripts/stub-rag-engine.ts`, a ~60 line Express app returning canned `/embed`, `/respond`, `/risk-score` responses, switched on locally via `RAG_ENGINE_URL`). Milestones map to the tasks in `10-build-guide.md`.

| Milestone | Scope | Build guide task |
|---|---|---|
| M0 Scaffold | Package, TypeScript strict, ESLint, Prettier, Vitest, folder structure, `.env.example`, CI-ready scripts | Task 2 (part) |
| M1 Foundation | `config/env`, Mongo connection and indexes, logger, request id, error classes, error handler, health routes, `app.ts` / `server.ts` split, graceful shutdown | Task 2 |
| M2 Auth and seller | AUTH-1..7, SEL-1..4, 6, 7, crypto helper | Task 2 / pre-req for 4 |
| M3 Catalog | CAT-1..9 against the stub embed | Task 4 |
| M4 Webhook pipe | WH-1..5 with logging only, no AI reply | Task 3 |
| M5 Reply loop | rag-engine client, CONV-1, 2, 10, 11, WH-6..8 | Task 6 (Node side) |
| M6 Order flow | CONV-3..9 | Task 7 (Node side) |
| M7 Sheets | SHT-1..7 | Task 9 |
| M8 Orders | ORD-1..10, retry job | Task 10 |
| M9 Hardening | Isolation suite complete, rate limits, failure injection tests, `15-security.md` pass, `npm audit` clean | Tasks 11 and 12 |

Checkpoint after M2, M5, M8 and M9: all tests green, `npm run build` clean, lint clean, manual smoke of the new capability.

M0 to M3 and M4 need no external accounts except MongoDB Atlas and a Meta test app, so they can start immediately.

## 15. Deltas from existing docs

These resolve gaps or conflicts found while writing this PRD. Patch the older docs when convenient.

1. `16-api-contract.md` error shape `{ error: { code, message } }` is adopted as is. (An older project convention in some earlier repos used `{ success: false, ... }`; this repo uses the contract's shape.)
2. `POST /auth/register` stays, but is gated by `REGISTRATION_MODE=invite` so it respects "no self-serve signup" in `05-scope.md`.
3. `POST /seller/connect-sheets` in the contract is replaced by `GET /seller/connect-sheets/url` plus `GET /integrations/google/callback`, because a browser redirect cannot call a JWT-protected POST.
4. Added endpoints: `GET /health/deps`, `PATCH /seller/me`, `DELETE /seller/connect-facebook`, `GET /catalog/:id`, `POST /catalog/:id/reembed`, `POST /catalog/import`, `PATCH /orders/:id/status`, `POST /orders/:id/retry-sheet`, `POST /orders/retry-sheets`. Task 10 in the build guide requires a retry path but did not name its endpoints.
5. `06-server-architecture.md` lists the module shape without a repo file; this PRD adds `<module>.repo.ts` and a `conversation` module to enforce seller scoping and to hold the order state machine out of `webhook`.
6. New collection `webhook_events` (dedupe) and new fields `embedStatus`, `status` on sellers, `fallbackMessage`, order retry bookkeeping. `08-design.md` section 1 should be updated.
7. New env vars: `ENCRYPTION_KEY`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `REGISTRATION_MODE`, `INVITE_CODE`, `GOOGLE_OAUTH_REDIRECT_URI`, `CORS_ORIGINS`, `ENABLE_RETRY_JOB`, `RAG_ENGINE_TIMEOUT_MS`. `06-server-architecture.md` section 6 lists only a subset.
8. `META_PAGE_ACCESS_TOKEN` as an app-level env var in `06-server-architecture.md` is dropped: tokens are per seller, encrypted in Mongo.

## 16. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Meta webhook retries while a slow AI call is still running | Duplicate replies or duplicate orders | `webhook_events` dedupe by `mid` (WH-3), tested |
| rag-engine not built yet when core-api is | Blocks end-to-end testing | Stub service and `msw` contract mocks; Zod response validation catches drift on integration |
| Google `drive.file` scope proves insufficient for the Sheets API | Rework of SHT-1 and SHT-3 | Verify in the first hour of M7 with your own Google account before building around it |
| Sheet append succeeds but the response is lost, then retry duplicates the row | Seller sees a duplicate order row | Idempotent append by Order ID lookup (SHT-6), tested |
| A repo function written without the `sellerId` argument | Cross-seller leak, ends a pilot | Repo signature convention, isolation suite, route-list meta test |
| In-process retry job running on two instances | Double Sheet writes | Single instance in MVP, idempotent append as backstop, documented in 6.3 |
| Meta Page token expires or is revoked | Replies silently stop | Log `190` errors loudly, show connection health in `GET /seller/me` later |
| Customer chat text retained indefinitely | Privacy exposure | 30 day TTL on conversations, rolling window of 12 messages |

## 17. Open questions

1. **Page token acquisition (Q1).** For the pilots, are you comfortable pasting a long-lived Page token by hand, or should a Meta OAuth login flow be part of the core API now? Default in this PRD is by hand, OAuth moves to the dashboard phase.
2. **Human handoff.** The launch roadmap mentions routing unanswerable questions to the seller's own inbox. This PRD only replies with the honest "I don't have that" text. Decide whether a handoff flag on the conversation is wanted before the first pilot.
3. **Order confirmation wording.** The confirm and cancel keyword lists and the template texts need a pass with real Bangla and mixed-language phrasing before pilots.
4. **Price handling.** Whole-taka integers assume no paisa. Confirm with the first pilot's catalog.
5. **Seller order status workflow.** ORD-6 lets sellers mark orders confirmed or cancelled through the API. Confirm this is wanted before the dashboard exists, or defer to Phase 4.

## 18. Definition of done for the core API MVP

- Every **Must** requirement above is implemented and has a named test.
- The isolation suite passes for every scoped route.
- All failure-injection tests pass.
- `npm run lint`, `npm run build` and `npm test` pass; `npm audit` shows no high or critical findings.
- Against the real rag-engine on staging, the live flow from `05-scope.md` section 7 works: question, grounded answer, order, row in the Sheet with its risk flag.
- `15-security.md` checklist items for this service are checked, and `.env.example` contains no real secret.
- `PROGRESS.md` shows every Must item checked.
