# jobabai.com: Code Review Checklist

The five-axis review standard to run against every task in `10-build-guide.md` before marking it done, not just once at the end. Solo build, so this doubles as a self-review pass, and Claude can run this same checklist as a second pass between phases.

## How to use this

After finishing each task in the build guide, run this checklist against just that task's diff before checking its acceptance criteria as done. Small, frequent review beats one giant review at the end, jobabai's phases are already sized (S/M per task) specifically so each review stays fast.

## The Five Axes

### 1. Correctness
- [ ] Matches the task's acceptance criteria in `10-build-guide.md` exactly, not an approximation of it
- [ ] Edge cases handled: empty catalog, a question with no relevant match, a malformed phone number, a Sheets API failure mid-write
- [ ] Error paths handled, not just the happy path (see `12-test-and-debug-strategy.md` for the specific failure modes to check)
- [ ] For the RAG path specifically: does the reply ever answer from outside the retrieved context? (This is the single most important correctness check in the whole project, requirement F5)

### 2. Readability and Simplicity
- [ ] Names match your existing project conventions (no `temp`, `data`, `result` without context)
- [ ] Each module stays focused on its one responsibility from `06-server-architecture.md` / `01-architecture-and-mvp-scope.md`'s module tables
- [ ] No premature abstraction, a rule-based `risk-score` function does not need a plugin architecture for one seller's pilot

### 3. Architecture
- [ ] New code lives in the correct module, feature-specific logic does not leak into `lib/` or a shared helper
- [ ] `sellerId` scoping is present on every query that touches `products`, `conversations`, or `orders`, no exceptions, this is the one architectural rule that cannot bend
- [ ] The Node/Python boundary is respected, business logic that belongs in `jobabai-rag-engine` (RAG, risk scoring) does not creep into `jobabai-core-api`, and vice versa

### 4. Security
- [ ] No secrets in code or committed to the repo, only in Railway env vars (per `15-security.md`)
- [ ] Every seller-facing endpoint checks the JWT and scopes to the correct `sellerId`
- [ ] The Meta webhook signature is verified before the payload is trusted
- [ ] The internal AI-service endpoints check the shared-secret header, are not reachable without it
- [ ] Full detail in `15-security.md`, this axis defers to that file rather than duplicating it

### 5. Performance
- [ ] No unbounded loops or unconstrained fetches (a catalog query should never fetch another seller's data by accident, which is also a security concern, listed twice on purpose)
- [ ] The `jobabai-core-api` to `jobabai-rag-engine` call has its timeout and retry-then-fallback in place, not a call that can hang forever (per `08-design.md` section 6)
- [ ] Conversation history stays a rolling window, not an unbounded array that grows forever per conversation

## Change sizing

Each task in `10-build-guide.md` was deliberately sized S or M (per the planning skill's sizing table) specifically to keep each review small: roughly 100 lines changed is comfortably reviewable in one sitting, 300 is acceptable for a single logical change, past that split the task further rather than reviewing a huge diff at once.

## Dependency discipline

Before adding any new package to either service, check: does the existing stack already solve this (Zod on the Node side, Pydantic on the Python side both already cover validation), is it actively maintained, does it have known vulnerabilities (`npm audit` / `pip-audit`). Likely dependencies for this project and why each is justified:

| Package | Service | Why |
|---|---|---|
| `openai` | `jobabai-rag-engine` | Official SDK, no reason to hand-roll HTTP calls to OpenAI |
| `qdrant-client` | `jobabai-rag-engine` | Official client |
| `fastapi`, `uvicorn`, `pydantic` | `jobabai-rag-engine` | Per ADR-001 |
| `mongodb` (native driver) | `jobabai-core-api` | Matches your existing stack, no ORM needed |
| `googleapis` | `jobabai-core-api` | Official Google client for Sheets API |
| `zod` | `jobabai-core-api` | Existing convention |

No dependency beyond this list should be needed for the MVP. If one comes up mid-build, run it through the check above before adding it, do not add it silently.

## Verdict template (use per task)

```markdown
## Review: Task [N], [title]
- [ ] Correctness
- [ ] Readability
- [ ] Architecture
- [ ] Security
- [ ] Performance
- [ ] Verdict: Approve / Request changes
```
