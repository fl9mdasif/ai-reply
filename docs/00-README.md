# jobabai.com Project Docs

This folder holds the working documentation for jobabai.com (the AI customer-support product for f-commerce sellers, formerly internally called autorichAi, briefly planned as riplai.com before that domain turned out to be already taken). Start here, then read the others in order.

## Foundation (decisions, cost, setup)

1. **01-architecture-and-mvp-scope.md**: what the MVP does and the architecture behind it (stack decisions made Sep 29, 2026)
2. **02-cost-estimate-year-1.md**: sourced cost numbers for running this for a year at MVP/pilot scale
3. **03-deployment-guide.md**: where and how to deploy each piece (Railway, MongoDB Atlas, Qdrant, domain/DNS)
4. **04-project-kickoff-checklist.md**: Week 0/1/2 steps from account setup to Phase 1 done

## Engineering set (scope to scale)

5. **05-scope.md**: MVP scope, functional and non-functional requirements, definition of done
6. **06-server-architecture.md**: Node/Express main app, modules, request lifecycle, error handling
7. **07-rag-engine-adr.md**: ADR-001, why FastAPI for the Python AI service
8. **08-design.md**: data model, RAG pipeline, caching, retry and fallback logic
9. **09-plan.md**: implementation plan by phase, checkpoints, risks, open questions
10. **10-build-guide.md**: task-by-task build checklist with acceptance criteria and verification
11. **11-review-checklist.md**: five-axis code review standard, run after every task
12. **12-test-and-debug-strategy.md**: test pyramid, TDD workflow, jobabai-specific debugging triage
13. **13-ship-checklist.md**: pre-deploy, deploy, post-deploy, pilot-seller rollout, rollback triggers
14. **14-scale-and-reliability.md**: load stages, what breaks first, what to revisit as jobabai grows
15. **15-security.md**: seller data isolation, webhook signature, internal service auth, secrets
16. **16-api-contract.md**: endpoint-by-endpoint reference for both services

## Condensed version

**jobabai-mvp-project-plan.md** is a single medium-size file covering files 01 to 04 in condensed form. Use it for a quick overview, use 01 to 04 for full detail.

## Related docs (in the Asif AI SaaS lab Cowork project, not this folder)

- `jobabai-launch-roadmap.md`: product positioning, pricing tiers, payment collection in Bangladesh, go-to-market sequence
- `income-roadmap-1000-this-month.md`: this month's overall income plan (jobabai is one stream among several)
- `client-acquisition-strategy.md`: outreach channels and proposal structure

## Decisions locked in (Sep 29, 2026)

- **Backend**: Hybrid, Node/Express/TypeScript for the main app, plus a small Python/FastAPI microservice for the AI/RAG logic
- **AI provider**: OpenAI, GPT-4o-mini class model for MVP
- **Deployment**: PaaS (Railway), not a raw VPS
- **Budget ceiling**: $20 to $50/month for infrastructure during the pre-revenue MVP/pilot phase

Everything in this folder is built around these four decisions. If any of them change, the cost, deployment, and architecture docs need a re-pass.
