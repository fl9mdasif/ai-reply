# jobabai.com

> **🚧 UNDER ACTIVE DEVELOPMENT** — Pre-launch. Not production-ready.

AI-powered auto-reply SaaS for Bangladeshi Facebook f-commerce sellers. Handles customer inquiries, screens COD orders, and reduces fake orders — all via Messenger.

---

## Status

| App | Phase | Status |
|-----|-------|--------|
| `apps/core-api` | M0–M9 | 🟡 M9 in progress — blocked on Railway + Meta credentials |
| `apps/rag-engine` | RE-M0–RE-M4 | 🟡 RE-M4 in progress — RE-M0 to RE-M3 complete (37/37 tests pass) |
| `apps/web` | FE-M0–FE-M4 | 🟡 FE-M0 scaffold done, FE-M1 to FE-M3 implemented — Vercel deploy pending |

---

## Monorepo structure

```
jobabai.com/
├── apps/
│   ├── core-api/          Express + TypeScript API (Node.js)
│   ├── rag-engine/        FastAPI + Python RAG service
│   └── web/               Next.js 14 landing page (jobabai.com)
├── docs/                  Planning, ADRs, PRDs
└── README.md
```

---

## apps/web — Landing page

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Framer Motion · next-intl (Bengali + English)

**Brand:** Black `#000000` · Violet `#7D39EB` · Lime `#C6FF33` · White `#FFFFFF`

```
src/
  app/[locale]/            Next.js locale routing
  components/
    sections/              Page sections (Navbar, Hero, Problem, …)
    ui/                    Reusable UI (TiltCard, Reveal)
    MessengerMockup.tsx    3D animated chat preview
    LandingPage.tsx        Thin orchestrator
  lib/
    motion.ts              Framer Motion helpers
    icons.ts               Lucide icon map
  i18n/                    next-intl config + routing
  messages/
    en.json                English translations
    bn.json                Bengali translations
```

```bash
cd apps/web
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## apps/rag-engine — RAG service

**Stack:** Python 3.12 · FastAPI · OpenAI Embeddings · Qdrant

```bash
cd apps/rag-engine
cp .env.example .env   # fill credentials
pip install -e ".[dev]"
pytest                 # 37 tests pass
```

---

## apps/core-api — Core API

**Stack:** Node.js · Express · TypeScript · MongoDB · Vitest

```bash
cd apps/core-api
cp .env.example .env   # fill credentials
npm install
npm run dev
npm test
```

---

## Development workflow

- Branch: `staging` → PR to `main` after milestone complete
- Each milestone pushed when complete (not mid-feature)
- Build tracker: see Artifact tracker (internal)

---

## Blocked on (external credentials)

- Railway project setup
- MongoDB Atlas M0 cluster
- Meta developer app + test Page
- Google Cloud OAuth client
- OpenAI API key
- Qdrant Cloud cluster
