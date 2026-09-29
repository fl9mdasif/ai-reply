# jobabai.com: MVP Project Plan

Technical plan for the jobabai.com AI customer-support MVP (formerly autorichAi). Companion to `jobabai-launch-roadmap.md` in the Asif AI SaaS lab project, which covers positioning, pricing, and go-to-market, this doc is architecture, cost, and build steps only.

## Decisions locked in (Sep 29, 2026)

- **Backend**: Hybrid, Node/Express/TypeScript (your existing stack) for the main app, plus a small Python/FastAPI microservice for the AI/RAG logic
- **AI provider**: OpenAI, GPT-4o-mini class model
- **Deployment**: PaaS (Railway), not a raw VPS
- **Budget ceiling**: $20 to $50/month during the pre-revenue MVP/pilot phase

---

## 1. MVP scope

Seller connects their Facebook Page. A customer asks a product question, jobabai answers from that seller's own catalog (RAG, not a generic bot). If the customer wants to order, jobabai collects the order details, screens for COD (cash-on-delivery) risk patterns, and logs it to that seller's own Google Sheet. That's the whole MVP: no WhatsApp, no Instagram, no custom dashboard yet, those are later phases.

## 2. Architecture

```
Meta Webhook (Messenger) → Node/Express API → Python/FastAPI AI service → OpenAI
                                 │                        │
                                 ▼                        ▼
                          MongoDB Atlas              Qdrant (vectors)
                     (sellers, orders, convos)     (product catalog embeddings)
```

Both services deploy as two Railway services in one project, talking over Railway's private network, only the Node API is public. Repo is a monorepo (`apps/core-api`, `apps/rag-engine`).

**Node/Express modules**: `auth`, `seller`, `catalog` (product CRUD, triggers re-embedding), `webhook` (Meta events in, replies out), `order` (structured order, writes to seller's Sheet + Mongo), `sheets-integration`.

**Python/FastAPI modules**: `embed` (chunk + embed catalog into Qdrant, partitioned by `seller_id`), `retrieve` (top-k relevant chunks for a question), `respond` (build prompt, call OpenAI), `risk-score` (rule-based COD risk flags, not ML, explainable and enough for MVP).

Multi-tenant from day one: every collection carries `sellerId`, retrofitting this later is real rework.

## 3. Year 1 cost estimate

GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens (OpenAI official, Aug 2026). At pilot-to-early-growth volume (1,000 to 50,000 exchanges/month), that's roughly $0.35 to $17.50/month, a small fraction of anything you'd charge.

| Item | Free tier? | Monthly cost |
|---|---|---|
| Domain (.com) | No | ~$1 |
| Railway (2 services) | $5 Hobby incl. $5 credit | $15 to $25 |
| MongoDB Atlas | Yes (M0, 512MB) | $0 at pilot scale |
| Qdrant Cloud | Yes (0.5vCPU/1GB) | $0 at pilot scale |
| OpenAI (GPT-4o-mini) | No, cheap | $2 to $20 |
| Meta Messenger API | Yes | $0, no platform fee |
| Google Sheets API | Yes | $0 |
| Email + monitoring (Resend, Sentry) | Yes | $0 |
| **Core MVP total** | | **$18 to $47/month** |

**Phase 3 addition (WhatsApp, mid-year)**: messages inside an open 24h customer-service window are free; only template messages outside that window cost, rates vary by country. Realistic added cost at pilot scale: $5 to $20/month via Meta's Cloud API directly. A third-party BSP (360dialog, Gupshup) adds its own platform fee, often $30 to $50/month, in exchange for an easier setup, skip this if you're comfortable integrating Meta's API yourself.

**Full Year 1, phased**: ~$20/month for months 1-3 (Messenger-only), ~$35 to $55/month for months 4-12 (+ WhatsApp, growing usage). Total: **roughly $375 to $555 for the year**, average $31 to $46/month, inside your stated ceiling.

What would push this up: MongoDB free tier filling (unlikely at pilot scale, M2 is $9/month if it does), OpenAI cost scaling with conversation volume (self-correcting, more usage means the product is working), heavy proactive WhatsApp messaging outside the service window (watch this monthly once WhatsApp launches).

## 4. Deployment

1. Register/confirm jobabai.com, point DNS at Railway once deployed.
2. MongoDB Atlas: free M0 cluster, DB user, connection string into Railway env vars.
3. Qdrant Cloud: free-tier cluster, URL + API key into the AI service's env vars.
4. OpenAI: API key, set a hard monthly spend limit in the dashboard (5-minute step, do this before anything else touches the API).
5. Railway: one project, two services (`jobabai-core-api`, `jobabai-rag-engine`) from GitHub, `staging` and `production` environments, auto-deploy on push.
6. Meta Developer app: Facebook App with the Messenger product, test Page, webhook pointed at staging, subscribed to `messages`.
7. Google Sheets API: enable in Google Cloud Console, OAuth credentials for writing to sellers' Sheets.
8. Secrets in Railway env vars only, never committed, keep a `.env.example` with placeholder keys in the repo.

Reconsider Railway vs a VPS only once jobabai hits real scale (tens of thousands of conversations/month), a fixed-price VPS can beat metered PaaS at that point, not a Year 1 concern.

## 5. Kickoff checklist

**Week 0 (half a day)**: domain, GitHub repo (private monorepo), Railway account, MongoDB Atlas free cluster, Qdrant free cluster, OpenAI account + spend limit, Meta Developer app + test Page, Google Sheets API enabled.

**Week 1 (skeleton)**: scaffold both apps, deploy empty versions to Railway staging, confirm the two services reach each other internally, wire the Meta webhook to staging and confirm a test message logs (no AI reply yet, just prove the pipe works).

**Week 2 (the actual MVP flow)**: build `catalog` (simple form/CSV input), build `embed` (catalog into Qdrant), build `retrieve` + `respond` (Messenger message in, grounded reply out), test against a real catalog and confirm answers aren't hallucinated, build the COD order-confirmation + risk-score flow writing to a test Google Sheet.

**Exit criteria**: message a test Page live, ask a real product question, get a correct grounded answer, say "I want to order," complete the flow, see the order land in a Google Sheet with a risk flag if applicable. If that works live without breaking, Phase 1 is done and outreach (already running per the client acquisition doc) can start converting demos into pilots.

**Deliberately waits**: WhatsApp/Instagram (Phase 3), custom dashboard (Phase 4, once the Sheet becomes the bottleneck), billing automation, full Meta Business Verification (test-mode messaging doesn't need it, going live with real pilots does).

## Sources for the cost figures

- [GPT-4o mini pricing, verified against OpenAI's official rates, Aug 2026](https://devtk.ai/en/models/gpt-4o-mini/)
- [Railway pricing breakdown](https://livemy.app/blog/railway-pricing)
- [MongoDB Atlas pricing, official](https://www.mongodb.com/pricing)
- [WhatsApp Business Platform pricing, Meta for Developers, official](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Qdrant Cloud pricing, official](https://qdrant.tech/pricing/)
