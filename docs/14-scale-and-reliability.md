# jobabai.com: Scale and Reliability

What the MVP's architecture can absorb as-is, and the specific points where it needs to change. Written now so scaling decisions are made deliberately later, not discovered as an outage.

## 1. Load estimation

| Stage | Sellers | Monthly exchanges | Notes |
|---|---|---|---|
| Pilot (now) | 2 to 4 | Low thousands | What the current architecture and cost estimate (`02-cost-estimate-year-1.md`) is sized for |
| Early growth | 10 to 20 | 20,000 to 50,000 | Roughly the scale where jobabai clears $1,000/month MRR per the launch roadmap |
| Real scale | 50+ | 100,000+ | Worth re-architecting parts of this before arriving here, not after |

At pilot scale, every part of the current design (synchronous request/response, free-tier Mongo and Qdrant, a single Railway service pair) comfortably holds. The estimates below are for knowing what changes and when, not because anything needs to change today.

## 2. What breaks first, in order

1. **MongoDB Atlas M0 free tier (512MB)**: fills up first among the storage layers, at pilot scale unlikely inside Year 1. Fix is a one-step upgrade to M2 ($9/month), not a re-architecture.
2. **Synchronous webhook processing**: fine while a reply takes a few seconds and volume is low. Once catalogs get large or concurrent conversations spike, the 8 second timeout in `08-design.md` starts getting hit more often. Fix: move catalog re-embedding (already the heavier of the two AI-service calls) onto a background job/queue, keep the live-reply path synchronous since it needs to stay fast regardless.
3. **Qdrant Cloud free tier (0.5 vCPU/1GB)**: holds fine for a handful of sellers' catalogs, the limit is disk/RAM per collection size, not request volume at this stage.
4. **Railway's usage-based pricing**: cost-effective for unpredictable, low, bursty traffic, exactly the pilot profile. Becomes worth re-pricing against a fixed-cost VPS only once traffic is high and steady, not before, see `03-deployment-guide.md` section 5.

## 3. Horizontal vs vertical scaling

Both Railway services scale vertically first (more CPU/RAM on the same instance) since that requires zero code change and Railway supports it directly in the dashboard. Horizontal scaling (multiple instances behind a load balancer) becomes relevant only once a single instance's CPU/RAM is actually the bottleneck, not before, premature horizontal scaling adds complexity (session/state handling, at minimum keeping the AI service stateless, which it already is by design) without benefit at pilot volume.

## 4. Failover and redundancy

Not built for the MVP, deliberately. MongoDB Atlas and Qdrant Cloud both handle their own underlying redundancy on their managed tiers. Railway itself is the single point of failure for both services at this scale, acceptable for a pilot phase with no formal SLA (per `05-scope.md` section 5). Worth revisiting once a paying pilot seller's business genuinely depends on jobabai staying up, not before.

## 5. Monitoring and alerting

Minimum viable set for the MVP (see also `13-ship-checklist.md`'s monitoring section):

- Error reporting (Sentry free tier) on both services, alerts on new error types
- Railway's own built-in resource dashboards (CPU/RAM/request count per service)
- A manual daily OpenAI spend check against the hard limit until the usage pattern is well understood
- A log-based check for any `sellerId`-missing query reaching production (see `12-test-and-debug-strategy.md`)

What is deliberately NOT built yet: a dedicated uptime monitor (Better Uptime, Pingdom, etc.), a metrics dashboard beyond Railway's built-in one, or automated alerting beyond error-reporting notifications. Add these once there's a paying pilot whose expectations justify the extra setup time, not speculatively now.

## 6. What to revisit as jobabai grows, in priority order

1. Move catalog re-embedding to a background job once bulk catalog uploads become common (Early growth stage)
2. Upgrade MongoDB to M2/M10 once the free tier's 512MB is genuinely tight, not before
3. Add a response cache for exact-repeat FAQ questions if OpenAI cost or latency at volume becomes a real line item, not speculative
4. Re-price Railway vs a VPS once traffic is high and steady rather than bursty
5. Add dedicated uptime monitoring once a pilot seller's business depends on jobabai staying up

Each of these is a deliberate, scoped change when its trigger condition is actually met, not a thing to build ahead of need. Building them now would spend budget and time the MVP does not have against a scale jobabai has not reached yet.
