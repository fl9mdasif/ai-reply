# jobabai.com: Test and Debug Strategy

Combines the project's testing plan with its debugging approach into one working doc, since on a solo build you move between writing a test and chasing a bug in the same sitting.

## 1. Test pyramid for this project

```
        /  E2E (~5%)   \      Full live flow: message → reply → order → Sheet row
       / Integration     \    jobabai-core-api ↔ jobabai-rag-engine calls, Mongo writes, Sheets API
      /   (~15%)          \
     /  Unit tests (~80%)  \  Risk-score rules, prompt-building, Zod/Pydantic validation,
    /______________________\  chunking logic, signature verification
```

Most of what deserves a unit test here is pure logic with no network call: the risk-score rules, the request/response validation, the chunking function, the Meta signature verification. These are fast, deterministic, and catch the bugs most likely to actually occur. The RAG reply itself is not fully unit-testable (it calls OpenAI), that is what integration and manual E2E testing cover instead.

## 2. What to cover, by component

| Component | Test type | What to actually test |
|---|---|---|
| `verify-meta-signature` middleware | Unit | Valid signature passes, invalid/missing signature is rejected with 401 |
| `risk-score` rules | Unit | Each rule individually: malformed phone triggers a flag, clean order does not, rule explanations are correct |
| Catalog Zod/Pydantic schemas | Unit | Valid entry passes, missing required field is rejected with a clear error |
| `embed` chunking logic | Unit | A catalog entry produces the expected number/shape of chunks |
| `retrieve` + `respond` | Integration | Given a seeded test catalog in a test Qdrant collection, a known question returns a grounded answer citing the right product; a question with no match returns the honest "I don't know" reply, not a hallucination |
| `jobabai-core-api` ↔ `jobabai-rag-engine` internal call | Integration | The shared-secret header is required, timeout/retry/fallback triggers correctly on a simulated slow or failing `jobabai-rag-engine` |
| Sheets write + fallback | Integration | A successful write appends the correct row; a simulated Sheets failure still saves the order to Mongo and sets `sheetRowWritten: false` |
| Full order flow | E2E (manual, for the MVP) | The live test from `05-scope.md` section 7, run by hand before every deploy, not automated yet at this scale |

What to skip: no test needed for FastAPI's or Express's own routing internals, no test needed for the OpenAI or Qdrant SDKs' own correctness, those are the vendor's responsibility, not yours.

## 3. TDD workflow for this project

For any new logic (a risk rule, a validation schema, the chunking function): write the failing test first, then the minimal code to pass it, then refactor. For a bug fix, always reproduce with a failing test before touching the fix, this is the Prove-It Pattern, and it matters especially for the RAG-hallucination class of bug, where "it seems fixed" without a repro test is not trustworthy.

```
Example: bug report, "the bot answered a price question with a price
that's not in the catalog"

1. Write a test: seed a test catalog missing that price, ask the exact
   question, assert the reply does NOT contain an invented number and
   DOES contain the "I don't have that information" fallback language
2. Confirm the test fails against current code (reproduces the bug)
3. Fix the system prompt / retrieval logic
4. Confirm the test passes
5. Run the full test suite, confirm nothing else broke
```

## 4. Debugging triage, jobabai-specific failure modes

Use the Stop-the-Line rule: stop adding new tasks, preserve the failing state (logs, the exact message that triggered it), diagnose before touching code.

| Symptom | Likely cause | Where to look first |
|---|---|---|
| Webhook events stop arriving | Meta signature verification broken, or webhook URL pointed at the wrong environment | Meta Developer app's webhook status page, Railway staging vs production logs |
| Bot answers with information not in the catalog | System prompt instruction not strong enough, or retrieval returning irrelevant chunks | Log the retrieved chunks for that request, check if they're actually relevant, tighten the prompt or the top-k value |
| Bot says "I don't know" for something that IS in the catalog | Embedding/chunking issue, or the question's embedding doesn't match well | Check Qdrant directly for that seller's vectors, confirm the product is actually embedded |
| Order not appearing in the Sheet | OAuth token expired/revoked, or the fallback path silently swallowing the error | Check the order's `sheetRowWritten` flag in Mongo first, confirms whether it's a Sheets-side or Mongo-side issue |
| `jobabai-core-api` to `jobabai-rag-engine` calls timing out | Railway internal networking misconfigured, or `jobabai-rag-engine` genuinely overloaded/crashed | Railway service logs for `jobabai-rag-engine`, direct health-check call between the two services |
| Cross-seller data appears | A `sellerId` filter missing somewhere, this is the most serious class of bug in the project | Grep every query in the affected module for a missing `sellerId` filter, treat as a Critical-severity fix, not a nit |

## 5. Instrumentation

Keep permanently: error logging with request context (`sellerId`, endpoint, error) on both services, a log line for every AI-service call showing which chunks were retrieved (this is the fastest way to diagnose a hallucination or a missed-answer bug). Remove after debugging: any temporary `console.log`/`print` added while chasing a specific issue, before marking that task's review as done per `11-review-checklist.md`.

## 6. Verification before calling a task done

- [ ] New logic has a corresponding unit or integration test
- [ ] Bug fixes have a reproduction test that failed before the fix and passes after
- [ ] The full test suite passes, not just the new test
- [ ] The live manual E2E flow (`05-scope.md` section 7) still works after the change
