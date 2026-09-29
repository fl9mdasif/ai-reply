# jobabai.com: Security Checklist

One of the two bonus docs you added on top of the original list, alongside `16-api-contract.md`. Focused on what's actually specific to jobabai's architecture, not a generic security checklist, generic items (dependency audits, secrets hygiene) are covered briefly since they're already in `13-ship-checklist.md`.

## 1. The one non-negotiable: seller data isolation

Every query against `products`, `conversations`, or `orders` must filter by `sellerId`. This is worth its own top-level section rather than burying it in a checklist, because it is the single failure mode that would end a pilot relationship immediately if it happened even once.

- [ ] Every Mongo query in `catalog`, `webhook`, `order` modules includes a `sellerId` filter, no query fetches by `_id` alone without also checking `sellerId` matches the authenticated session
- [ ] Qdrant queries always filter by `sellerId` in the payload, never a bare top-k search across the whole collection
- [ ] A manual spot-check test exists: seller A's JWT cannot retrieve seller B's catalog, conversation, or order data, even by guessing an ID

## 2. Meta webhook security

- [ ] `X-Hub-Signature-256` header is verified against your Meta app secret on every incoming webhook request, before the payload is trusted (per `06-server-architecture.md` section 3)
- [ ] The webhook verification challenge (Meta's initial handshake) uses a verify token that is not guessable and stored as an env var, not hardcoded
- [ ] Page access tokens are stored encrypted at rest in MongoDB, not in plaintext (per `08-design.md` section 1)

## 3. Internal service-to-service auth

- [ ] `jobabai-rag-engine` checks a shared-secret header (`RAG_ENGINE_INTERNAL_TOKEN`) on every request, rejects anything without it
- [ ] `jobabai-rag-engine`'s Railway service has no public domain attached, or if Railway assigns one by default, it is explicitly disabled/not used, confirmed unreachable from outside per the Task 2 verification step in `10-build-guide.md`
- [ ] FastAPI's auto-generated `/docs` endpoint is disabled or protected in the `production` environment (it is fine, even useful, in `staging`)

## 4. Secrets management

- [ ] Every API key (OpenAI, MongoDB URI, Qdrant, Meta app secret, Google OAuth client secret, JWT secret, internal service token) lives only in Railway environment variables
- [ ] `.env.example` in the repo has placeholder values only, never a real key
- [ ] No key appears in a commit, a log line, or an error message returned to a client

## 5. Google OAuth and Sheets access

- [ ] Refresh tokens are stored encrypted at rest, scoped to the minimum Sheets API permission needed (append rows to a specific sheet, not broad Drive access)
- [ ] A seller can revoke access, and jobabai handles a revoked/expired token gracefully (falls back to the `sheetRowWritten: false` retry path in `08-design.md`, not a crash)

## 6. Input validation and injection

- [ ] Every request body is validated at the boundary (Zod on Node, Pydantic on Python), before it reaches business logic, matching the validation discipline already established for both services
- [ ] Customer-supplied text (the Messenger message itself) is treated as untrusted input into the OpenAI prompt, standard prompt-construction practice (system instructions clearly separated from user content) is enough for this use case, no special sanitization needed since the model output is a customer-facing chat reply, not executed code or a database query
- [ ] MongoDB queries use the native driver's parameterized query methods, no string-built queries anywhere

## 7. Rate limiting

- [ ] The Meta webhook route has basic rate limiting per Page ID, protects against a misbehaving or malicious sender flooding requests and running up OpenAI cost
- [ ] Seller-facing auth endpoints (login) are rate-limited per IP/account, standard brute-force protection

## 8. Dependency and audit hygiene

- [ ] `npm audit` (Node) and `pip-audit` (Python) run before each production deploy, no critical/high findings unresolved (already listed in `13-ship-checklist.md`, repeated here since it's part of the security surface, not duplicated in depth)

## Verification

- [ ] Manual cross-seller isolation test passes (section 1)
- [ ] A direct external request to `jobabai-rag-engine`'s domain is rejected or unreachable
- [ ] A webhook request with an invalid signature is rejected with 401
- [ ] `.env.example` contains no real secret, confirmed by a quick diff read before every commit that touches it
- [ ] `npm audit` / `pip-audit` both clean before production deploy
