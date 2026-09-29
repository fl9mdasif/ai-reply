# jobabai.com: MVP Scope and Requirements

Defines what "done" means for Phase 1 before any code is written. Pairs with `01-architecture-and-mvp-scope.md` (the architecture behind this scope) and `jobabai-launch-roadmap.md` (the business phases this maps to).

## 1. Problem statement

Bangladeshi f-commerce sellers run their whole storefront through a Facebook Page. Every product question and every order comes in as a DM, answered by hand, one at a time. That does not scale past a handful of orders a day, and a meaningful share of COD (cash-on-delivery) orders never get delivered, wasting the seller's stock and courier cost. jobabai answers product questions automatically from the seller's own catalog and screens COD orders for obvious risk before they ship.

## 2. In scope for the MVP (Phase 1 and 2)

- Seller connects one Facebook Page to jobabai
- Seller uploads a product catalog (name, price, description, FAQ entries)
- Customer messages the Page, jobabai answers from that seller's catalog only (RAG, not a generic model answer)
- Customer says they want to order, jobabai collects structured order details (product, quantity, name, phone, address)
- Order gets a rule-based COD risk flag (not ML)
- Order is written to that seller's own Google Sheet, and to MongoDB as jobabai's own record

## 3. Explicitly out of scope for the MVP

- WhatsApp and Instagram (Phase 3)
- A custom seller-facing dashboard (Phase 4, Google Sheets is the interim dashboard on purpose)
- Self-serve seller signup (first 2 to 4 pilots are onboarded by hand)
- Automated billing (manual bKash/Nagad collection per the launch roadmap)
- A fine-tuned or self-hosted model (OpenAI API is the entire AI layer)
- Multi-language support beyond Bangla and English mixed in customer messages (the model handles this natively, no separate translation layer needed)

Anything not in the list above that comes up during build gets written down as a Phase 3+ item, not quietly added to the MVP.

## 4. Functional requirements

| ID | Requirement |
|---|---|
| F1 | A seller can register and connect a Facebook Page via Meta OAuth |
| F2 | A seller can add, edit, and remove catalog entries |
| F3 | Adding or editing a catalog entry re-embeds it into Qdrant within a few seconds |
| F4 | An incoming Messenger message triggers a webhook, gets a grounded reply within a few seconds |
| F5 | A reply never invents a product, price, or policy that is not in the seller's catalog |
| F6 | An order-intent message starts a structured collection flow (product, quantity, name, phone, address) |
| F7 | A completed order is risk-scored and written to the seller's Google Sheet and to MongoDB |
| F8 | Every request and record is scoped to the correct `sellerId`, no cross-seller data leakage |

## 5. Non-functional requirements

| Dimension | Target for MVP | Why this level |
|---|---|---|
| Latency | Reply within 5 to 8 seconds of a customer message | Messenger users expect a fast reply, but this is not a hard real-time system, a few seconds is acceptable |
| Availability | Best-effort, no formal SLA | Pilot phase, a few sellers, not yet revenue-critical |
| Scale | 2 to 4 pilot sellers, low thousands of exchanges/month | Matches the cost plan in `02-cost-estimate-year-1.md` |
| Data isolation | Hard requirement, not best-effort | One seller ever seeing another seller's catalog or orders ends the pilot relationship immediately |
| Cost | $20 to $50/month | Locked-in budget ceiling |

## 6. Constraints

- Solo developer, existing Node/Express/TypeScript conventions from HydraaZone, the IT agency site, and the inventory system carry over
- Budget ceiling $20 to $50/month during pre-revenue MVP
- Deployment target is Railway (PaaS), not a VPS
- Timeline target: demoable MVP within 2 weeks of kickoff (see `10-build-guide.md`)

## 7. Definition of done for the MVP

You can sit in front of a prospective pilot seller, message their test Facebook Page live from your phone, ask a real product question, get a correct grounded answer, say "I want to order," complete the flow, and see the order land in a Google Sheet with a risk flag if applicable. If that works live without breaking, Phase 1 is done.

## 8. Open questions to resolve before or during build

- Exact COD risk rules for v1 (repeat-cancellation tracking needs at least one full order cycle of data, so v1 likely ships with only the rules that need no history: malformed phone number, delivery area mismatch)
- Whether the first pilot sellers upload catalogs as a CSV or jobabai enters it for them by hand (either is fine for 2 to 4 sellers, worth deciding once the first pilot is lined up, not before)
