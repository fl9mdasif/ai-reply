# Implementation Plan: jobabai.com MVP (Phase 1 and 2)

## Overview

Build and ship the Messenger-based AI product-support bot with COD order confirmation, per the scope in `05-scope.md`. Solo build, hybrid Node/Express + Python/FastAPI stack, deployed on Railway. Target: a live demoable flow within 2 weeks of kickoff, matching the exit criteria already set in `04-project-kickoff-checklist.md`. This plan sequences the work vertically, each task ends with something real you can test, not a horizontal "finish all the backend, then all the AI service" pass.

## Architecture Decisions

- Hybrid Node/Express (main app) + Python/FastAPI (AI service), see `01-architecture-and-mvp-scope.md`
- FastAPI specifically over Django/Flask, see `07-rag-engine-adr.md` (ADR-001)
- Railway PaaS, two services in one project, private internal networking, see `03-deployment-guide.md`
- MongoDB Atlas (free M0) + Qdrant Cloud (free tier) for storage, see `08-design.md`
- Multi-tenant from day one, every collection carries `sellerId`, see `08-design.md` section 1

## Task List

### Phase 0: Foundation (accounts, skeleton, the pipe works)

- [ ] Task 1: Accounts and repo setup (Week 0 checklist, see `10-build-guide.md`)
- [ ] Task 2: Scaffold `apps/core-api` and `apps/rag-engine`, deploy empty versions to Railway staging, confirm internal networking works
- [ ] Task 3: Wire the Meta webhook to staging, confirm a test message reaches `jobabai-core-api` and logs (no AI reply yet)

### Checkpoint: Foundation

- [ ] Both services deploy cleanly to staging
- [ ] `jobabai-core-api` can reach `jobabai-rag-engine` over Railway's internal network (a simple health-check call is enough proof)
- [ ] A message sent to the test Facebook Page shows up in `jobabai-core-api`'s logs

### Phase 1: The core Q&A flow (vertical slice: seller can add a product, customer can ask about it and get a real answer)

- [ ] Task 4: `catalog` module, seller can add/edit/remove a product via a simple endpoint (no UI polish needed yet, a form or even direct API calls are enough for the pilot phase)
- [ ] Task 5: `embed` endpoint in `jobabai-rag-engine`, catalog changes get chunked, embedded, upserted to Qdrant scoped to `sellerId`
- [ ] Task 6: `retrieve` + `respond` flow, incoming question gets grounded, non-hallucinated answer end to end, real reply sent back via Messenger

### Checkpoint: Core Q&A works

- [ ] A real product question against a real (even small/fake) catalog gets a correct, grounded answer
- [ ] Asking about something NOT in the catalog gets an honest "I don't have that" rather than an invented answer (this is requirement F5, worth deliberately testing, not just hoping)

### Phase 2: The order flow (vertical slice: customer can complete an order, seller sees it)

- [ ] Task 7: Order-intent detection and structured collection flow (product, quantity, name, phone, address)
- [ ] Task 8: `risk-score` module, rule-based flags on the completed order
- [ ] Task 9: `sheets-integration` module, OAuth connection per seller, order row appended to their Sheet
- [ ] Task 10: `order` module ties it together, writes to MongoDB as the source of truth, writes to Sheets, handles the Sheets-failure fallback from `08-design.md` section 6

### Checkpoint: Full MVP flow

- [ ] End-to-end: message the test Page, ask a question, get a grounded answer, say "I want to order," complete the flow, see the order in the Sheet with a risk flag if applicable
- [ ] This is the exit criteria from `05-scope.md` section 7, if this works live without breaking, Phase 1 and 2 are done

### Phase 3: Hardening before the first real pilot

- [ ] Task 11: Security pass per `15-security.md` (signature verification, key handling, data isolation spot-check)
- [ ] Task 12: Deploy checklist and staged rollout per `13-ship-checklist.md`

### Checkpoint: Ready for a real pilot seller

- [ ] Everything in `13-ship-checklist.md`'s pre-deploy section is checked
- [ ] Production environment (not just staging) is live and verified with your own test Page first

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OpenAI answers hallucinate outside the catalog | High, breaks trust with pilot sellers immediately | Explicit "only answer from context, say so if unknown" system prompt instruction, deliberately tested per Checkpoint after Phase 1 |
| Google Sheets OAuth setup is fiddly per seller | Medium, could stall onboarding | Budget real time for this in Week 2, test with your own Google account first before a real seller's |
| COD risk rules flag too aggressively or not at all with zero historical data | Medium, a v1 limitation, not a bug | Ship with only the rules that need no history (malformed phone, area mismatch), be explicit with pilot sellers that repeat-cancellation tracking improves after their first order cycle |
| Railway internal networking misconfigured, AI service accidentally exposed publicly | Medium, a real security issue if it happens | Explicit checklist item in `15-security.md`, verify with a direct external request to the AI service's Railway-assigned domain, confirm it is rejected or unreachable |
| Solo build, no second reviewer | Low but real | Self-review against `11-review-checklist.md`'s five axes before treating any phase as done, and use Claude as a second-pass reviewer between phases |

## Open Questions

- Whether the first 2 pilot sellers are lined up before or after Phase 2 finishes (affects whether Google Sheets OAuth gets tested with a real seller account during build or only after)
- Exact wording of the fallback "I don't have that information" reply, worth a short pass with actual Bangla/English mixed customer phrasing before the first live pilot, not a blocker for build

## Notes

This plan tracks tasks inline above rather than in a separate `tasks/todo.md` checklist file, because you asked for a dedicated file named as a build guide instead, see `10-build-guide.md` for the same tasks in a per-task acceptance-criteria/verification/dependencies format ready to work through one at a time.
