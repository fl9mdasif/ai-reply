# jobabai.com: Build Guide

Task-by-task checklist for the MVP, one task at a time, each with acceptance criteria and a verification step. This is the companion to `09-plan.md` (the narrative plan and phase checkpoints), written as the thing you actually work through day to day. Check a box only once its verification step actually passes, not once the code is written.

---

## Task 1: Accounts and repo setup

**Description:** Every external account and the repo skeleton, before any product code.

**Acceptance criteria:**
- [ ] jobabai.com domain confirmed/registered
- [ ] Private GitHub monorepo created (`apps/core-api`, `apps/rag-engine` structure per `03-deployment-guide.md`)
- [ ] Railway, MongoDB Atlas (M0), Qdrant Cloud (free tier), OpenAI (with a hard spend limit set), Meta Developer app + test Page, Google Sheets API all created/enabled

**Verification:**
- [ ] Every account listed above is reachable and has its API key/credential in hand
- [ ] OpenAI dashboard shows a spend limit actually set, not just default

**Dependencies:** None
**Files likely touched:** repo initialization only
**Estimated scope:** XS

---

## Task 2: Scaffold both services, deploy empty, confirm internal networking

**Description:** Get `jobabai-core-api` and `jobabai-rag-engine` deployed to Railway staging as empty/hello-world services that can reach each other privately.

**Acceptance criteria:**
- [ ] `apps/core-api` scaffolded per `06-server-architecture.md`'s folder structure
- [ ] `apps/rag-engine` scaffolded per `07-rag-engine-adr.md`'s action items
- [ ] Both deploy to Railway staging successfully
- [ ] `jobabai-core-api` can call a health-check endpoint on `jobabai-rag-engine` over Railway's internal network

**Verification:**
- [ ] `GET /health` on `jobabai-core-api` returns 200 and includes a successful ping to `jobabai-rag-engine`
- [ ] `jobabai-rag-engine`'s Railway-assigned public domain, if it has one, is confirmed unreachable from outside (private-only)

**Dependencies:** Task 1
**Files likely touched:** `apps/core-api/src/app.ts`, `apps/core-api/src/server.ts`, `apps/rag-engine/main.py`, Railway config
**Estimated scope:** S

---

## Task 3: Wire the Meta webhook, confirm the pipe works

**Description:** Point the Meta app's webhook at staging, prove a real Messenger event reaches `jobabai-core-api` and gets logged, no AI reply yet.

**Acceptance criteria:**
- [ ] `webhook` module receives and logs Meta's webhook verification challenge correctly
- [ ] `verify-meta-signature` middleware rejects an unsigned/incorrectly signed request
- [ ] A real message from the test Page shows up in staging logs

**Verification:**
- [ ] Send a message to the test Page from your phone, confirm it appears in Railway's staging logs within seconds
- [ ] Manually send a request with a bad signature, confirm it is rejected with 401, not silently accepted

**Dependencies:** Task 2
**Files likely touched:** `apps/core-api/src/modules/webhook/*`, `apps/core-api/src/middleware/verify-meta-signature.ts`
**Estimated scope:** S

---

## Task 4: Catalog module

**Description:** A seller can add, edit, and remove product/FAQ entries.

**Acceptance criteria:**
- [ ] `POST/PUT/DELETE` endpoints for catalog entries, JWT-authenticated, scoped to `sellerId`
- [ ] Entries validated with Zod (name and price required, description/FAQ optional)
- [ ] Every write triggers a call to `jobabai-rag-engine`'s `/embed` endpoint (can be a stub returning 200 until Task 5 is done)

**Verification:**
- [ ] Add a product via the API, confirm it is stored with the correct `sellerId`
- [ ] Attempt to add a malformed entry (missing name), confirm it is rejected with a clear validation error

**Dependencies:** Task 2
**Files likely touched:** `apps/core-api/src/modules/catalog/*`
**Estimated scope:** S

---

## Task 5: Embed endpoint (`jobabai-rag-engine`)

**Description:** Chunk, embed, and upsert a seller's catalog into Qdrant.

**Acceptance criteria:**
- [ ] `POST /embed` accepts a catalog entry, chunks it, generates embeddings, upserts to Qdrant with `sellerId` and `productId` in the payload
- [ ] Re-embedding an edited entry replaces the old vectors for that product, does not just add duplicates

**Verification:**
- [ ] Add a product via Task 4's endpoint, confirm new vectors appear in the Qdrant collection filtered to that `sellerId`
- [ ] Edit the same product, confirm the vector count for that `productId` does not grow unbounded

**Dependencies:** Task 4
**Files likely touched:** `apps/rag-engine/embed.py`
**Estimated scope:** S

---

## Task 6: Retrieve + respond flow

**Description:** A real customer question gets a grounded, non-hallucinated answer sent back via Messenger.

**Acceptance criteria:**
- [ ] `POST /respond` embeds the question, retrieves top-k chunks scoped to `sellerId` from Qdrant, builds the prompt, calls OpenAI, returns the reply
- [ ] The system prompt explicitly instructs the model to answer only from provided context and say so honestly when it does not know
- [ ] `jobabai-core-api`'s webhook module wires this into the live Messenger flow, reply is actually sent back to the customer

**Verification:**
- [ ] Ask a real question about a real catalog entry from your phone, confirm a correct, grounded answer arrives
- [ ] Ask about something NOT in the catalog, confirm the reply is an honest "I don't have that information," not an invented answer (this is the F5 requirement from `05-scope.md`, test it deliberately)

**Dependencies:** Task 5, Task 3
**Files likely touched:** `apps/rag-engine/retrieve.py`, `apps/rag-engine/respond.py`, `apps/core-api/src/modules/webhook/*`
**Estimated scope:** M

---

## Task 7: Order-intent detection and structured collection

**Description:** When a customer signals they want to order, collect product, quantity, name, phone, and address through the conversation.

**Acceptance criteria:**
- [ ] `/respond`'s response includes an order-intent flag the Node side can act on
- [ ] A simple stateful flow (can live in the `conversations` collection's rolling window) walks the customer through providing the missing fields
- [ ] Handles a customer providing multiple fields in one message, not just one-at-a-time

**Verification:**
- [ ] Say "I want to order" in a live test conversation, confirm the bot asks for the specific missing fields
- [ ] Provide all fields in one message, confirm it does not re-ask for fields already given

**Dependencies:** Task 6
**Files likely touched:** `apps/core-api/src/modules/order/*`, `apps/rag-engine/respond.py`
**Estimated scope:** M

---

## Task 8: Risk-score module

**Description:** Rule-based COD risk flags on a completed order.

**Acceptance criteria:**
- [ ] `POST /risk-score` applies the v1 rule set from `05-scope.md` section 8 (malformed phone, delivery area mismatch), returns flags and a simple score
- [ ] Rules are explainable, each flag has a human-readable reason a seller can understand

**Verification:**
- [ ] Submit an order with a clearly malformed phone number, confirm it is flagged
- [ ] Submit a clean order, confirm it is not flagged

**Dependencies:** None (can be built in parallel with Task 7)
**Files likely touched:** `apps/rag-engine/risk_score.py`
**Estimated scope:** S

---

## Task 9: Sheets integration

**Description:** One-time Google OAuth per seller, order rows appended to their own Sheet.

**Acceptance criteria:**
- [ ] OAuth flow lets a seller connect their Google account, refresh token stored (encrypted) against their `sellerId`
- [ ] An order write appends a row with the expected columns (date, product, quantity, customer, phone, address, risk flags)

**Verification:**
- [ ] Complete the OAuth flow with your own Google account, confirm the refresh token is stored
- [ ] Trigger an order write, confirm the row appears in the actual connected Sheet within seconds

**Dependencies:** Task 2
**Files likely touched:** `apps/core-api/src/modules/sheets-integration/*`
**Estimated scope:** M

---

## Task 10: Order module, tying it together

**Description:** Complete the order flow end to end: Mongo write (source of truth), Sheets write, and the Sheets-failure fallback.

**Acceptance criteria:**
- [ ] A completed order (Task 7) plus its risk score (Task 8) is written to MongoDB first, always
- [ ] The Sheets write (Task 9) happens after, failure there does not lose the order, `sheetRowWritten: false` is set for retry
- [ ] A background or on-demand retry path exists for orders with `sheetRowWritten: false`

**Verification:**
- [ ] Complete a live order end to end, confirm it appears in both MongoDB and the seller's Sheet
- [ ] Simulate a Sheets API failure (revoke the token temporarily), confirm the order is still saved to MongoDB and flagged for retry, not lost

**Dependencies:** Task 7, Task 8, Task 9
**Files likely touched:** `apps/core-api/src/modules/order/*`
**Estimated scope:** M

---

## Checkpoint: Full MVP flow (after Task 10)

- [ ] Live end-to-end test: message the test Page, ask a real question, get a correct answer, order, see it land in the Sheet with a risk flag if applicable
- [ ] This matches the exit criteria in `05-scope.md` section 7 and `04-project-kickoff-checklist.md`

---

## Task 11: Security pass

**Description:** Work through `15-security.md` before any real pilot seller's data touches the system.

**Acceptance criteria:** see `15-security.md` in full
**Verification:** see `15-security.md`'s verification section
**Dependencies:** Task 10
**Files likely touched:** cross-cutting, both services
**Estimated scope:** S

---

## Task 12: Ship checklist and staged rollout

**Description:** Work through `13-ship-checklist.md` before switching a real pilot seller's Page from staging to production.

**Acceptance criteria:** see `13-ship-checklist.md` in full
**Verification:** see `13-ship-checklist.md`'s post-deploy section
**Dependencies:** Task 11
**Files likely touched:** Railway config, monitoring setup
**Estimated scope:** S
