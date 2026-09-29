# jobabai.com: Project Kickoff Checklist

The concrete, in-order steps to go from "decisions made" to "Phase 1 MVP demoable." Ties directly into the Week 1-2 items in `jobabai-launch-roadmap.md`, this is the technical setup that has to happen alongside that outreach work, not after it.

## Week 0: accounts and repo (half a day, do this before writing any product code)

- [ ] Register/confirm jobabai.com domain
- [ ] Create a GitHub repo (monorepo, per `03-deployment-guide.md`), private for now
- [ ] Create a Railway account, connect it to the GitHub repo
- [ ] Create a MongoDB Atlas account, spin up the free M0 cluster
- [ ] Create a Qdrant Cloud account, spin up the free-tier cluster
- [ ] Create an OpenAI account, add billing, set a hard monthly spend limit
- [ ] Create a Meta Developer account, create a Facebook App (Messenger product), create or use a test Facebook Page for development
- [ ] Enable the Google Sheets API in Google Cloud Console

## Week 1: the skeleton

- [ ] Scaffold `apps/core-api` (Express + TypeScript + Zod, reuse the module template from `SERVER-ARCHITECTURE.md`)
- [ ] Scaffold `apps/rag-engine` (FastAPI, minimal structure: `embed.py`, `retrieve.py`, `respond.py`, `risk_score.py`)
- [ ] Deploy both, empty/hello-world, to Railway staging, confirm they can reach each other over the internal network
- [ ] Wire up the Meta webhook to staging, confirm a test message from your test Page reaches `jobabai-core-api` and logs it (no AI reply yet, just prove the pipe works end to end)

## Week 2: the actual MVP flow

- [ ] Build the `catalog` module: a seller can input product/FAQ entries (a simple form or CSV upload is enough, no need for a polished UI yet)
- [ ] Build the `embed` endpoint in `jobabai-rag-engine`: takes a seller's catalog text, chunks it, embeds it, upserts to Qdrant under that seller's `seller_id`
- [ ] Build the `retrieve` + `respond` flow: incoming Messenger message, in `jobabai-core-api`, calls `jobabai-rag-engine`, which retrieves relevant chunks and calls OpenAI, returns the reply, `jobabai-core-api` sends it back via the Messenger Send API
- [ ] Test with your own test Page and a real product catalog (even a fake one), confirm the answers are actually grounded in the catalog, not hallucinated
- [ ] Build the COD order-confirmation flow: detect an "I want to order" intent, collect structured order details, run the `risk-score` rules, write the row to a test Google Sheet

## Week 2 exit criteria (this is your "demo-ready" bar from the launch roadmap)

You should be able to sit in front of a prospective pilot seller, message their Facebook Page live from your phone, ask a real product question, get a correct grounded answer, then say "I want to order," go through the flow, and have the order appear in a Google Sheet with a risk flag if applicable. If you can do that live without it breaking, Phase 1 is done and outreach (already running in parallel per the client acquisition doc) can start converting demos into pilots.

## What deliberately waits until after a pilot is running

- WhatsApp and Instagram integration (Phase 3)
- The custom seller dashboard (Phase 4, only once the Google Sheet becomes the bottleneck)
- Any billing automation
- Production-level Meta Business Verification (test-mode messaging with a small number of test users doesn't require it, full public access does, cross this bridge once you have a real pilot ready to go live)
