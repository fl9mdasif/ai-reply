# jobabai.com: Deployment Guide

Where and how each piece runs, using the PaaS (Railway) decision. This avoids VPS-style server administration (patching, process managers, manual SSL) so you spend time on the product, not DevOps, which matters when you're building solo.

## 1. Project layout

One Railway project, two services inside it:
- `jobabai-core-api`: the Node/Express/TypeScript main app
- `jobabai-rag-engine`: the Python/FastAPI AI microservice

Railway services inside the same project can talk to each other over its private internal network, so `jobabai-core-api` calls `jobabai-rag-engine` without that service ever being exposed publicly. Only `jobabai-core-api` gets a public domain.

Repo structure, a monorepo is simpler to manage solo than two separate repos:
```
jobabai/
  apps/
    core-api/     Node/Express/TS: seller, catalog, webhook, order, Sheets
    rag-engine/   Python/FastAPI: embed, retrieve, respond, risk-score (internal only)
    dashboard/    Phase 4, Next.js seller dashboard (not built in the MVP)
  packages/
    shared-types/ (optional, shared TS types if useful later)
  docs/           this doc set
```

Names describe the job, not the language, so they stay true even if a service is ever rewritten. Put a one-line `README.md` in each app folder (for example: "Python/FastAPI RAG service, internal only, called by core-api") so the repo explains itself at first glance.

## 2. Environments: staging and production, from day one

Even for an MVP, run two Railway environments (Railway supports this natively per project): `staging` and `production`. Point your Meta app's webhook at staging while you're testing with your own test Facebook Page, only switch pilots over to production once a feature is verified working. This is a small extra setup step now that saves you from ever debugging a broken flow live in front of a paying pilot seller.

## 3. Step by step

1. **Domain**: register jobabai.com (if not already done) at a standard registrar, point its DNS to Railway once your `jobabai-core-api` service has a Railway-assigned domain or your own custom domain attached in the Railway dashboard.
2. **MongoDB Atlas**: create a free M0 cluster, create a database user, allow-list Railway's outbound IPs (or use Atlas's "allow from anywhere" for MVP simplicity, tighten later), copy the connection string into Railway's environment variables for `jobabai-core-api`.
3. **Qdrant Cloud**: create a free-tier cluster, copy its URL and API key into `jobabai-rag-engine`'s environment variables.
4. **OpenAI**: create an API key, set a hard monthly spend limit in the OpenAI dashboard (Settings, Billing, Usage limits) so a bug can't run up an unexpected bill, this is a five-minute step that matters.
5. **Railway**: create the project, add `jobabai-core-api` and `jobabai-rag-engine` as two services from your GitHub repo (Railway auto-deploys on push once connected), set environment variables per service, set up the `staging`/`production` environments.
6. **Meta Developer app**: create a Facebook App in Meta for Developers, add the Messenger product, generate a Page access token for your test Page, point the webhook URL at your staging `jobabai-core-api` URL, subscribe to the `messages` webhook field.
7. **Google Sheets API**: enable the Sheets API in Google Cloud Console, set up OAuth credentials (you'll need this per-seller later, for now a service account or your own OAuth token is enough for the pilot), store credentials in `jobabai-core-api`'s environment variables.
8. **CI/CD**: Railway's GitHub integration handles this by default, push to your `staging` branch deploys to the staging environment, push/merge to `main` deploys to production, no separate CI tool needed at this scale.

## 4. Secrets management

Keep all API keys (OpenAI, MongoDB URI, Qdrant, Meta app secret, Google OAuth) in Railway's environment variables, never committed to the repo. Use a `.env.example` file in the repo (with placeholder values only) so the actual required variables are documented for future-you or anyone else who joins.

## 5. When to reconsider this setup

Railway's usage-based pricing is the right call for an MVP with unpredictable, low traffic. If jobabai grows to real scale (tens of thousands of conversations/month, per the cost doc's higher-volume scenarios), it's worth re-pricing against a VPS at that point, since a busy always-on service can end up cheaper on a fixed-price VPS than on a metered PaaS. That's a good-problem-to-have decision for later, not a Year 1 concern.
