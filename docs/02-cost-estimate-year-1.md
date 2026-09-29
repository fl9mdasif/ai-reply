# jobabai.com: Year 1 Cost Estimate

Real, sourced numbers as of September 2026, not guesses. Built around the decisions locked in: Railway (PaaS), OpenAI GPT-4o-mini, MongoDB Atlas, Qdrant Cloud. Sources for every price are listed at the bottom, worth re-checking these before you commit a card, especially Railway and OpenAI, both change pricing more often than the others.

## 1. Core MVP costs (Phase 1 and 2: Messenger + COD screening, no WhatsApp yet)

| Item | Free tier available? | Realistic monthly cost | Annual (x12) |
|---|---|---|---|
| Domain (jobabai.com, already have or renewing) | No | ~$1/month (roughly $12 to $15/year for a `.com`) | ~$13 |
| Railway (both services: Node API + Python AI service) | $5 Hobby plan includes $5 usage credit | $15 to $25/month for two small always-on services | $180 to $300 |
| MongoDB Atlas | Yes, M0 free tier (512MB) | $0 while on the free tier, sufficient for pilot scale (a handful of sellers) | $0 |
| Qdrant Cloud (vector DB for RAG) | Yes, free tier (0.5 vCPU / 1GB RAM / 4GB disk) | $0 while on the free tier, sufficient for a handful of sellers' product catalogs | $0 |
| OpenAI API (GPT-4o-mini) | No, but very cheap at this volume | $2 to $20/month depending on conversation volume (see the worked estimate below) | $24 to $240 |
| Meta Messenger Platform (webhooks, Send API) | Yes, free | $0, Meta does not charge for the Messenger API itself | $0 |
| Google Sheets API (order logging) | Yes, free at this usage level | $0 | $0 |
| Transactional email (Resend or similar, for seller account emails) | Yes, free tier (thousands of emails/month) | $0 | $0 |
| Error monitoring (Sentry or similar) | Yes, free tier | $0 | $0 |
| SSL certificates | Yes, automatic via Railway | $0 | $0 |
| **Core MVP total** | | **$18 to $47/month** | **$217 to $553/year** |

This sits inside your $20 to $50/month ceiling at the low-to-mid end, and only brushes the top of it at the high-usage end, which would only happen once you already have real conversation volume from paying sellers, a good problem to have.

### OpenAI cost, worked out, not just asserted

GPT-4o-mini: $0.15 per million input tokens, $0.60 per million output tokens (as of August 2026, OpenAI's official rate).

A single customer exchange (system prompt + a few retrieved product-catalog chunks + recent conversation history + the customer's question) runs roughly 1,000 to 1,500 input tokens, and a reply is typically 100 to 300 output tokens.

| Monthly conversation volume | Rough monthly OpenAI cost |
|---|---|
| 1,000 exchanges (very early pilot, 2 to 3 sellers) | ~$0.35 |
| 5,000 exchanges (a handful of active pilot sellers) | ~$1.75 |
| 20,000 exchanges (10+ paying sellers, real usage) | ~$7 |
| 50,000 exchanges (20+ paying sellers, the scale where jobabai clears $1,000/month MRR per the launch roadmap) | ~$17.50 |

Even at real, revenue-generating scale, the AI cost itself stays a small fraction of what you'd be charging. It is not the line item to worry about.

## 2. Phase 3 addition: WhatsApp (added mid-year, once Messenger is proven)

WhatsApp Business Platform pricing changed to per-message billing in mid-2025, and most of what an early support bot sends stays free: any message sent inside an open 24-hour customer service window (i.e. replying to a customer who messaged you first) is free regardless of type. You only pay for template messages sent outside that window (marketing templates always cost, utility/authentication templates cost only outside the service window), and the exact rate depends on the recipient's country.

For a support-reply use case like jobabai (customers message first, you reply within the window), realistic added cost at pilot scale is small, likely $5 to $20/month once WhatsApp is live, more if you start proactively messaging customers (order-status updates sent outside the service window) rather than only replying. Instagram DM, like Messenger, has no Meta platform fee.

If you go through a third-party BSP (Business Solution Provider like 360dialog, Gupshup, Interakt) instead of Meta's own Cloud API directly, expect an added monthly platform fee on top of Meta's per-message rate, often $30 to $50/month, in exchange for an easier setup and a management UI. Going direct to Meta's Cloud API avoids that fee but means you handle the integration yourself, which your hybrid stack is already set up to do.

## 3. Full Year 1 total, phased realistically

Phase 3 (WhatsApp) doesn't start on day one, per the launch roadmap it lands once Messenger has 2 to 3 proven pilots, realistically month 3 or 4. Blending that in:

| Period | Monthly cost | Months | Subtotal |
|---|---|---|---|
| Months 1 to 3 (Messenger-only MVP) | ~$20/month (low end of core estimate) | 3 | ~$60 |
| Months 4 to 12 (Messenger + WhatsApp, growing usage) | ~$35 to $55/month | 9 | ~$315 to $495 |
| **Year 1 total** | | | **~$375 to $555** |

That's an average of roughly $31 to $46/month across the full year, inside your stated ceiling. The honest caveat: this assumes you stay on free tiers for MongoDB and Qdrant the whole year, which is realistic at pilot scale (a handful to a couple dozen sellers) but would need revisiting if jobabai grows faster than expected, a genuinely good problem, not a planning failure.

## 4. What would push these numbers up, and what to actually watch

- **MongoDB free tier (512MB) fills up**: unlikely in year 1 at pilot scale, but if it does, M2 shared ($9/month) is the next step, not a crisis.
- **OpenAI cost scales with conversation volume, not seller count directly**: a seller with a busy Facebook Page costs more than one with a quiet one, this is usage-based and self-correcting, more usage means the product is working.
- **WhatsApp proactive messaging (order updates sent outside the service window)**: this is the one line item that can grow faster than expected if you lean on it heavily, worth watching monthly once WhatsApp launches rather than assuming the pilot-scale estimate holds forever.
- **Meta Business Verification**: free, but can require documents (business registration/trade license) once you move past test-mode messaging to full production access for a business Page, this ties to the legal/formalization note in `jobabai-launch-roadmap.md`, budget the administrative time, not money, for this.

## Sources

- [GPT-4o mini API Pricing, devtk.ai (verified against OpenAI's official pricing, August 2026)](https://devtk.ai/en/models/gpt-4o-mini/)
- [Railway pricing breakdown, livemy.app](https://livemy.app/blog/railway-pricing)
- [MongoDB Atlas pricing, official](https://www.mongodb.com/pricing)
- [WhatsApp Business Platform pricing, Meta for Developers, official](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Qdrant Cloud pricing, official](https://qdrant.tech/pricing/)
