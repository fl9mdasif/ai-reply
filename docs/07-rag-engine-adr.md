# ADR-001: Framework for rag-engine, the Python AI Service of jobabai.com

**Status:** Accepted
**Date:** 2026-09-29
**Deciders:** Asif (solo)

## Context

jobabai's core differentiator, the RAG-based product Q&A and the COD risk-scoring, lives in a Python service alongside the Node/Express main app (see `01-architecture-and-mvp-scope.md` for why the split is hybrid, not single-language). Python was already decided. What was not yet decided is which Python framework runs that service: FastAPI, Django, or plain Flask. This was explicitly re-confirmed by you during the clarifying-questions round on 2026-09-29: FastAPI, kept.

## Decision

Build the AI microservice (`apps/rag-engine`) on **FastAPI**.

## Options Considered

### Option A: FastAPI

| Dimension | Assessment |
|---|---|
| Complexity | Low for this service's actual shape, a handful of endpoints, no admin UI, no auth system of its own |
| Cost | No difference, same Railway hosting cost as any Python service |
| Scalability | Async-native, handles concurrent OpenAI/Qdrant calls without extra tooling, well suited to an I/O-bound service that mostly waits on external APIs |
| Team familiarity | New to you specifically, but the smallest surface area of the three to learn |

**Pros:** built-in request/response validation via Pydantic (mirrors the Zod validation discipline already used on the Node side), automatic OpenAPI docs for free (useful for `16-api-contract.md`'s internal endpoints), async support out of the box, minimal boilerplate for a small number of endpoints, the dominant choice in the current Python AI/RAG tooling ecosystem so examples and library integrations assume it.

**Cons:** less batteries-included than Django, you write your own project structure conventions rather than getting them from a framework.

### Option B: Django (+ Django REST Framework)

| Dimension | Assessment |
|---|---|
| Complexity | High relative to what this service needs, an ORM, admin panel, and app-config system this service will never use |
| Cost | Same hosting cost, but a heavier base image and slower cold starts |
| Scalability | Synchronous by default (Django's async support exists but is not where the ecosystem's tooling focuses), a worse fit for a service whose main job is waiting on OpenAI and Qdrant calls |
| Team familiarity | New to you, and the larger of the three to learn |

**Pros:** mature, batteries-included, a natural fit if this service ever needed its own admin UI or complex relational data, which it does not.

**Cons:** this service has no models needing an ORM (Mongo lives on the Node side), no admin UI need, no user-facing views, most of Django's value goes unused while its complexity still has to be learned and maintained.

### Option C: Flask (plain, no framework beyond it)

| Dimension | Assessment |
|---|---|
| Complexity | Low, arguably lower than FastAPI for a trivial service |
| Cost | Same |
| Scalability | Synchronous by default, needs extra libraries (`asyncio` support is bolted on, not native) to match FastAPI's async handling of concurrent OpenAI calls |
| Team familiarity | New to you |

**Pros:** minimal, well understood pattern industry-wide.

**Cons:** no built-in request validation (you would hand-roll what Pydantic gives FastAPI for free), no native async, no automatic API docs.

## Trade-off Analysis

The deciding factor is that this service is I/O-bound: every request spends most of its time waiting on OpenAI or Qdrant, not doing CPU work. FastAPI's native async handles that pattern with no extra libraries, and its Pydantic validation gives the same "reject bad input at the boundary" discipline the Node side already has with Zod, so the two services feel consistent to work in even though they are different languages. Django's extra weight (ORM, admin, auth system) buys nothing here since Mongo and JWT auth both live on the Node side. Flask would work but means hand-building validation and async support FastAPI gives natively.

## Consequences

- Easier: request validation, concurrent calls to OpenAI and Qdrant without blocking, self-documenting API for internal reference
- Harder: nothing significant for a service this size, the main cost is learning FastAPI's patterns (dependency injection, Pydantic models), which is a small surface area
- Revisit: only if the AI service grows a genuinely complex domain model or needs its own persistent storage beyond what Qdrant and the Node-side Mongo already provide, neither is expected in Year 1

## Action Items

1. [ ] Scaffold `apps/rag-engine` with FastAPI, `uvicorn` as the ASGI server
2. [ ] Define Pydantic models for every request/response shape up front (see `16-api-contract.md`)
3. [ ] Add a shared-secret header check (`RAG_ENGINE_INTERNAL_TOKEN`) so only `jobabai-core-api` can call this service, since it is not exposed publicly
4. [ ] Use FastAPI's built-in `/docs` only in the `staging` environment, disable or protect it in `production` since it would otherwise expose the internal API surface
