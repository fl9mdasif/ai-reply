# jobabai.com: Node/Express Server Architecture

The main app. Follows the same conventions as `SERVER-ARCHITECTURE.md` from your existing projects (HydraaZone, IT agency, inventory system), so nothing here should feel new, it is that same pattern applied to jobabai.

## 1. Folder structure

```
apps/core-api/
  src/
    modules/
      auth/
        auth.controller.ts
        auth.service.ts
        auth.routes.ts
        auth.schema.ts        (Zod)
      seller/
      catalog/
      webhook/
      order/
      sheets-integration/
    lib/
      db.ts                    (Mongo connection)
      rag-engine-client.ts      (internal HTTP client to jobabai-rag-engine)
      meta-client.ts            (Messenger Send API wrapper)
    middleware/
      error-handler.ts
      auth-guard.ts
      verify-meta-signature.ts
    config/
      env.ts                    (validated env vars, Zod)
    app.ts
    server.ts
  tests/
  .env.example
  package.json
```

Each module owns its own controller, service, routes, and Zod schema, the same shape as your existing projects. No module reaches into another module's internals, if `order` needs something from `catalog`, it imports `catalog`'s exported service functions, not its database model directly.

## 2. Module responsibilities

| Module | Responsibility | Depends on |
|---|---|---|
| `auth` | Seller signup/login, JWT issuance, session middleware | none |
| `seller` | Seller profile, connected Page ID, plan/tier | `auth` |
| `catalog` | Product CRUD, triggers re-embed call to `jobabai-rag-engine` on change | `seller`, `rag-engine-client` |
| `webhook` | Verifies Meta signature, parses incoming message, calls `jobabai-rag-engine` for a reply, sends it back via Messenger Send API | `seller`, `catalog`, `rag-engine-client`, `meta-client` |
| `order` | Structured order capture, calls `jobabai-rag-engine`'s risk-score endpoint, writes to Mongo, writes to the seller's Sheet | `seller`, `sheets-integration`, `rag-engine-client` |
| `sheets-integration` | One-time OAuth per seller, holds refresh token, appends rows | `seller` |

## 3. Request lifecycle (the webhook path, the one that matters most)

```
Meta POST /webhook/messenger
  → verify-meta-signature middleware (reject if invalid, 401)
  → webhook.controller parses the event
  → webhook.service looks up the seller by Page ID
  → webhook.service calls rag-engine-client.respond(sellerId, message, history)
  → rag-engine-client makes an internal HTTP call to jobabai-rag-engine over Railway's private network
  → jobabai-rag-engine returns { reply, orderIntentDetected }
  → if orderIntentDetected, webhook.service hands off to order.service
  → webhook.service calls meta-client.sendMessage(pageId, recipientId, reply)
  → 200 OK back to Meta (always, even on partial failure, Meta retries on non-200)
```

## 4. Error handling

- A single `error-handler` middleware, last in the chain, per your existing convention
- Every module throws typed errors (`NotFoundError`, `ValidationError`, `UpstreamError` for AI-service failures), never raw strings
- The webhook route always returns 200 to Meta even if the AI service call fails internally, log the failure and optionally send a seller-configured fallback message ("we're having trouble right now, we'll get back to you"), never let Meta retry-storm a broken webhook
- `rag-engine-client` calls have a timeout (8s) and one retry with backoff, if both fail, fall back to a generic "let me check and get back to you" reply rather than leaving the customer with no response

## 5. Auth and multi-tenancy

- Seller-facing endpoints (`catalog`, `seller`, `order` read endpoints) require a valid JWT, scoped to that seller's own `sellerId`
- `auth-guard` middleware injects `req.sellerId` from the verified JWT, every downstream query filters by it, there is no code path that queries across sellers
- The Meta webhook itself is not JWT-authenticated (Meta calls it directly), it is authenticated by the `verify-meta-signature` middleware checking the `X-Hub-Signature-256` header against your app secret

## 6. Config and environment

All secrets through `config/env.ts`, validated with Zod at startup, the app refuses to boot with a missing or malformed env var rather than failing at request time. Required vars: `MONGODB_URI`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN` (per seller in practice, stored in Mongo, this is the app-level secret), `RAG_ENGINE_URL`, `RAG_ENGINE_INTERNAL_TOKEN` (shared secret so `jobabai-rag-engine` only accepts calls from `jobabai-core-api`), `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `JWT_SECRET`.

## 7. What this module structure deliberately avoids

- No ORM abstraction layer beyond the native MongoDB driver plus Zod validation, matches your existing stack, no need to introduce Mongoose or Prisma for one small service
- No message queue for the MVP, webhook processing is synchronous request/response, only worth adding once volume or latency actually demands it (see `14-scale-and-reliability.md`)
- No GraphQL, plain REST matches your existing convention and there is no multi-client need yet
