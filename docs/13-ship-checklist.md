# jobabai.com: Ship and Launch Checklist

Pre-deploy, deploy, and post-deploy steps, plus a staged rollout adapted to jobabai's actual scale, which is a handful of pilot sellers, not thousands of anonymous users, so the rollout stages map to "which sellers are live," not traffic percentages.

## Pre-Deploy

### Code quality
- [ ] All tests pass (`12-test-and-debug-strategy.md`)
- [ ] Build succeeds on both services with no warnings
- [ ] No `console.log`/`print` debugging statements left in
- [ ] Error handling covers the failure modes listed in `12-test-and-debug-strategy.md` section 4

### Security
- [ ] `15-security.md`'s full checklist is complete
- [ ] `npm audit` (Node service) and `pip-audit` (Python service) show no critical/high vulnerabilities
- [ ] No secrets in the repo, only in Railway env vars

### Infrastructure
- [ ] Railway `production` environment variables set (separate from `staging`)
- [ ] MongoDB Atlas, Qdrant, OpenAI all confirmed reachable from the `production` environment specifically, not just staging
- [ ] Health check endpoint exists on `jobabai-core-api` and responds correctly
- [ ] DNS for jobabai.com points at the Railway-assigned domain for `jobabai-core-api`

### Documentation
- [ ] `.env.example` in the repo is current (matches every env var actually required)
- [ ] This doc set (`jobabai-docs/`) reflects what was actually built, not just what was planned, update any file that drifted during build

## Deploy

- [ ] Deploy to staging first, run the full manual E2E flow there (`05-scope.md` section 7)
- [ ] Deploy to production
- [ ] Verify production health check returns 200
- [ ] Check error monitoring (Sentry or equivalent), confirm no new error types on deploy
- [ ] Run the manual E2E flow again, this time on production, with your own test Page

## Post-Deploy (first hour)

- [ ] Health endpoint still returns 200
- [ ] No new error types in monitoring
- [ ] Logs are flowing and readable for both services
- [ ] The full live flow (message, answer, order, Sheet row) works on production, not just staging

## Staged rollout, jobabai-scale

Since this launches to a small number of hand-picked pilot sellers, not an anonymous user base, the "rollout percentage" stages become "which Page is live":

```
1. DEPLOY to production, your own test Page only
   → 24 to 48 hour monitoring window, use it yourself daily

2. FIRST pilot seller's Page goes live
   → Watch closely for the first few real customer interactions
   → Confirm no cross-seller data ever appears (the one non-negotiable check)

3. SECOND and THIRD pilot sellers
   → Same monitoring, now also watching for load/latency as concurrent
     sellers increase (still trivial volume at this stage, but the
     first real signal of how the system behaves with more than one
     seller active)

4. FOURTH pilot seller and beyond
   → At this point you have real usage data, revisit `14-scale-and-
     reliability.md`'s thresholds with actual numbers instead of estimates
```

### Rollback triggers

- Any cross-seller data leak, however small: immediate rollback, this is a trust-ending bug for a pilot relationship, not a "monitor and see" situation
- The webhook stops responding or Messenger replies stop arriving for more than a few minutes
- OpenAI spend limit is hit unexpectedly (should not happen given the cost estimates in `02-cost-estimate-year-1.md`, but if it does, something is looping or misconfigured, not just "usage is higher than expected")
- A pilot seller reports an order that never reached their Sheet AND is not in MongoDB either (the fallback in `08-design.md` section 6 should make this impossible, if it happens the fallback itself is broken)

### Rollback steps

1. Revert the Railway deploy to the previous version (`git revert` + push, Railway auto-deploys)
2. Verify the health check and a manual test message on the reverted version
3. If a pilot seller's Page was affected, message them directly, do not let them discover it themselves

## Monitoring to have in place before the first real pilot

- Error reporting (Sentry free tier or equivalent) on both services
- A simple daily check of OpenAI spend against the hard limit, at least until the pattern is well understood
- A log-based alert (even a manual daily glance is enough at this scale) for any query missing a `sellerId` filter making it to production, per the Critical-severity note in `12-test-and-debug-strategy.md`
