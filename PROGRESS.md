# jobabai.com: Progress Tracker

The single place to see how far the build is. Right now the focus is **`apps/core-api`** (Node, Express, TypeScript), built first against a stub of the rag-engine. The full requirements live in [`docs/17-core-api-prd.md`](docs/17-core-api-prd.md); every ID below (for example `AUTH-3`) matches a requirement in that PRD.

## How to use this file

- Tick a box (`[x]`) only when its verification passes, not when the code is written. A requirement is done when it has a passing test that names its ID and the code is committed.
- Priority tags: **(M)** Must for the MVP, **(S)** Should, **(C)** Could.
- Work top to bottom. Each milestone ends with a checkpoint that must be fully ticked before the next milestone starts.
- After ticking boxes, run `node scripts/progress.mjs --write` from the repo root. It recomputes the summary table below. Commit `PROGRESS.md` together with the code it describes.
- Anything new that comes up and is not in the PRD goes into "Parking lot" at the bottom, not into the milestones.

Last updated: 2026-10-18

## Summary

<!-- progress:start -->
Overall: **71/115** items done (62%)

```
[############--------] 62%
```

| Group | Done | Percent | Status |
|---|---|---|---|
| Prerequisites and planning | 3/8 | 38% | In progress |
| M0 Scaffold | 8/8 | 100% | Done |
| M1 Foundation | 11/13 | 85% | In progress |
| M2 Auth and Seller | 14/15 | 93% | In progress |
| M3 Catalog | 10/10 | 100% | Done |
| M4 Webhook pipe | 6/7 | 86% | In progress |
| M5 Reply loop | 11/12 | 92% | In progress |
| M6 Order flow (conversation state machine) | 8/8 | 100% | Done |
| M7 Sheets integration | 0/9 | 0% | Not started |
| M8 Orders | 0/11 | 0% | Not started |
| M9 Hardening | 0/9 | 0% | Not started |
| Integration with the real rag-engine | 0/3 | 0% | Not started |
| rag-engine (apps/rag-engine) | 0/1 | 0% | Not started |
| jobabai-dashboard (apps/jobabai-dashboard) | 0/1 | 0% | Not started |
<!-- progress:end -->

## Core API (apps/core-api)

### Prerequisites and planning

- [x] GitHub monorepo created with `apps/core-api`, `apps/rag-engine`, `apps/jobabai-dashboard` and `docs/`
- [x] Planning docs 00 to 16 written
- [x] Core API PRD written (`docs/17-core-api-prd.md`)
- [ ] MongoDB Atlas M0 cluster created, DB user and connection string in hand
- [ ] Meta developer app and test Page created (Messenger product added)
- [ ] Google Cloud project with Sheets API enabled and OAuth client created (redirect URI set)
- [ ] Railway project created with `staging` and `production` environments
- [ ] OpenAI key created with a hard monthly spend limit (needed when the rag-engine starts, not for the core API)

### M0 Scaffold

- [x] M0-1 `package.json` with scripts: `dev`, `build`, `start`, `test`, `lint`, `format` (M)
- [x] M0-2 TypeScript `strict: true` config (M)
- [x] M0-3 ESLint and Prettier configured and passing (M)
- [x] M0-4 Vitest, supertest, mongodb-memory-server and msw installed, one sample test passes (M)
- [x] M0-5 Folder structure from PRD section 6.1 created (M)
- [x] M0-6 `.env.example` lists every variable from PRD section 7 with placeholders only (M)
- [x] M0-7 First commit on the `staging` branch (M)
- [x] Checkpoint M0: `npm run lint`, `npm run build`, `npm test` all pass on a clean checkout

### M1 Foundation

- [x] FND-1 `config/env.ts` validates all env vars with Zod and the app refuses to boot on a bad value (M)
- [x] FND-2 `lib/db.ts` connects to Mongo and creates every index in PRD section 9 (M)
- [x] FND-3 `lib/logger.ts`, request id middleware and `pino-http` with secret redaction and masked phone numbers (M)
- [x] FND-4 `lib/errors.ts` typed errors and `error-handler` returning `{ error: { code, message } }` (M)
- [x] FND-5 `app.ts` and `server.ts` split, helmet, CORS allowlist, 100 KB body limit, trust proxy (M)
- [x] FND-6 General rate limiter in place (M)
- [x] FND-7 `lib/crypto.ts` AES-256-GCM encrypt and decrypt with round trip and tamper tests (M)
- [x] FND-8 Graceful shutdown on SIGTERM (M)
- [x] FND-9 `scripts/stub-rag-engine.ts` returns canned `/embed`, `/respond`, `/risk-score`, `/health` (M)
- [x] HLT-1 `GET /health` returns 200 with no dependencies (M)
- [x] HLT-2 `GET /health/deps` reports Mongo and rag-engine status (M)
- [ ] FND-10 Deployed to Railway staging, `/health` returns 200 over the public URL (M) — blocked: Railway project not created yet (see Prerequisites)
- [ ] Checkpoint M1: error shape consistent on 400, 404, 500 and bad JSON; app boots only with valid env; deployed to staging — blocked on FND-10 only, everything else verified

### M2 Auth and Seller

- [x] AUTH-1 Register validates, lowercases email, hashes password, creates seller (M)
- [x] AUTH-2 Invite code enforced when `REGISTRATION_MODE=invite` (M)
- [x] AUTH-3 Duplicate email returns 409 (M)
- [x] AUTH-4 Login returns JWT, all failures return the same 401 (M)
- [x] AUTH-5 `auth-guard` verifies JWT, loads seller, rejects suspended sellers, sets `req.sellerId` (M)
- [x] AUTH-6 Login and register rate limits (M)
- [x] AUTH-7 Passwords and hashes never in logs or responses (M)
- [x] SEL-1 `GET /seller/me` returns profile with no secret fields (M)
- [x] SEL-2 `POST /seller/connect-facebook` validates token against Graph API, encrypts and stores it (M)
- [x] SEL-3 Page already connected to another seller returns 409 (M)
- [x] SEL-4 App subscribed to the Page after connect, `webhookSubscribed` recorded (M)
- [x] SEL-5 `DELETE /seller/connect-facebook` unsubscribes and clears fields (S)
- [x] SEL-6 `PATCH /seller/me` with whitelisted fields (S)
- [x] SEL-7 `GET /seller/connect-sheets/url` with signed state (M)
- [ ] Checkpoint M2: register, login, `/seller/me` and Page connect work end to end against a real test Page; first isolation test file exists — isolation test file exists and all logic is tested (Graph API mocked with msw); blocked only on a real Meta test Page to verify end to end

### M3 Catalog

- [x] CAT-1 Create, read, list, update, delete scoped by `sellerId` (M)
- [x] CAT-2 Zod validation with bounds (M)
- [x] CAT-3 Embed call after every create and update, Mongo write never rolled back (M)
- [x] CAT-4 `embedStatus` tracked as synced or failed and returned to the seller (M)
- [x] CAT-5 Delete removes Mongo doc then calls vector removal, failure logged (M)
- [x] CAT-6 `POST /catalog/:id/reembed` (S)
- [x] CAT-7 `POST /catalog/import` bulk JSON import with bounded concurrency (S)
- [x] CAT-8 Pagination on list (M)
- [x] CAT-9 `nameLower` maintained for order-time matching (M)
- [x] Checkpoint M3: add, edit, delete a product via the API with the stub; malformed entry rejected; seller B cannot see seller A's products

### M4 Webhook pipe

- [x] WH-1 Handshake with constant-time verify token compare (M)
- [x] WH-2 Signature verified on the raw body, bad signature returns 401 (M)
- [x] WH-3 Duplicate `mid` processed once (`webhook_events`) (M)
- [x] WH-4 Seller resolved by Page id, unknown or suspended Page ignored with 200 (M)
- [x] WH-5 Valid-signature requests always get 200 (M)
- [x] Per-Page webhook rate limit (M)
- [ ] Checkpoint M4: a real message from the test Page appears in staging logs within seconds; a request with a bad signature is rejected with 401 — bad-signature rejection verified by test; the real-Page half is blocked on a Meta test Page + staging deploy (see Prerequisites)

### M5 Reply loop

- [x] `lib/rag-engine-client.ts` with timeouts, one retry, Zod-validated responses, internal token header (M)
- [x] `lib/meta-client.ts` Send API wrapper, failures logged not thrown (M)
- [x] CONV-1 Conversation upsert and rolling message window (M)
- [x] CONV-2 Idle messages go to `/respond`, order intent detected (M)
- [x] CONV-10 Assistant replies appended to the window (M)
- [x] CONV-11 Only the stored window is sent as history (M)
- [x] WH-6 Fallback message sent when the AI path fails (M)
- [x] WH-7 Send API uses `messaging_type: RESPONSE`, Meta errors logged with code (M)
- [x] WH-8 Per-event processing stays under 15 seconds (M)
- [x] WH-9 Non-text messages get the canned reply (S)
- [ ] WH-10 Typing indicator before the AI call (C)
- [x] Checkpoint M5: with the stub, a message to the test Page gets a reply back in Messenger; with the stub stopped, the fallback reply is sent; duplicate delivery produces one reply

### M6 Order flow (conversation state machine)

- [x] CONV-3 Field extraction merges across messages, multi-field messages handled, no re-asking filled fields (M)
- [x] CONV-4 Deterministic missing-field prompts (M)
- [x] CONV-5 Phone format check with one re-ask (M)
- [x] CONV-6 Summary and "reply YES to confirm" step (M)
- [x] CONV-7 Confirm, cancel and correction handling in `awaiting_confirmation` (M) — confirm returns a stub "order received" reply for now; wiring it to real order.service.createFromDraft (risk score, Mongo, Sheets) is M8
- [x] CONV-8 Stale drafts (30 minutes) discarded (M)
- [x] CONV-9 Cancel phrase clears the draft at any point (S)
- [x] Checkpoint M6: "I want to order" walks through all five fields live; all fields in one message does not re-ask; wrong phone is asked about once

### M7 Sheets integration

- [ ] SHT-1 Minimum OAuth scope confirmed against the real Sheets API (M)
- [ ] SHT-2 Signed `state` verified on callback (M)
- [ ] SHT-3 Callback stores encrypted refresh token and creates the "jobabai Orders" sheet (M)
- [ ] SHT-4 `appendOrderRow` writes the agreed columns (M)
- [ ] SHT-5 Revoked or expired grant becomes `SheetsAuthError`, no crash (M)
- [ ] SHT-6 Idempotent append on retry (Order ID lookup) (M)
- [ ] SHT-7 5 second timeout and one retry on Sheets calls (M)
- [ ] SHT-8 Disconnect Google (C)
- [ ] Checkpoint M7: OAuth completed with your own Google account, a test row lands in the real Sheet within seconds

### M8 Orders

- [ ] ORD-1 Creation sequence: risk (fail-soft), Mongo insert, Sheets (fail-soft) (M)
- [ ] ORD-2 Risk failure never blocks an order (M)
- [ ] ORD-3 Sheets failure never loses an order, `sheetRowWritten` stays false (M)
- [ ] ORD-4 `GET /orders` and `GET /orders/:id` scoped and paginated (M)
- [ ] ORD-5 Every risk flag has a human readable reason (M)
- [ ] ORD-6 `PATCH /orders/:id/status` (S)
- [ ] ORD-7 `retry-sheet` and `retry-sheets` endpoints (M)
- [ ] ORD-8 Background retry job, single instance, no overlap (S)
- [ ] ORD-9 Seller without a Sheet still gets orders saved, retry job skips them (M)
- [ ] ORD-10 Quantity and text bounds enforced (M)
- [ ] Checkpoint M8: live order lands in Mongo and the Sheet; with the Google token revoked the order is still saved and flagged, and the retry later writes it exactly once

### M9 Hardening

- [ ] Isolation suite covers every seller-scoped route, plus the route-list meta test (M)
- [ ] Failure-injection tests: rag-engine timeout and 500, embed failure, risk failure, Sheets failure, duplicate `mid` (M)
- [ ] Rate limits verified by tests (M)
- [ ] `15-security.md` items for this service all checked (M)
- [ ] `.env.example` re-read for real secrets before the release commit (M)
- [ ] `npm audit` clean of high and critical findings (M)
- [ ] Every Must requirement has a test that names its ID (M)
- [ ] Production environment deployed and verified with your own test Page (M)
- [ ] Checkpoint M9: Definition of done in PRD section 18 fully satisfied

### Integration with the real rag-engine

- [ ] Response contract tests pass against the real Python service on staging (M)
- [ ] Private networking confirmed: rag-engine has no reachable public domain (M)
- [ ] Live exit test from `05-scope.md` section 7: question, grounded answer, order, Sheet row with risk flag (M)

## Other apps (tracked here only at a high level)

### rag-engine (apps/rag-engine)

- [ ] Not started. Scaffold, `/embed`, `/respond`, `/risk-score`, `/health`. See `docs/07-rag-engine-adr.md`.

### jobabai-dashboard (apps/jobabai-dashboard)

- [ ] Not started. Phase 4, after the Sheet becomes the bottleneck.

## Parking lot (Phase 3+, not in the MVP)

Plain list on purpose, these are not counted in the summary.

- WhatsApp and Instagram channels
- Human handoff inbox
- Meta OAuth login flow for connecting Pages
- Refresh tokens and multi-user seller accounts
- Repeat-cancellation risk rules (needs a full order cycle of data)
- Message queue for bulk catalog re-embedding
- Sentry integration
- Automated billing
