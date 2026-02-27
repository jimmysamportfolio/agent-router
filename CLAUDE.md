# Agent Router

Policy compliance system for marketplace listings. LLM agents (Claude) + vector search (pgvector/Gemini) + async queue (BullMQ/Redis).

## Quick Reference

- **Imports**: `@/` alias for `src/`
- **No `any`**, unused vars prefixed `_`
- **Strict TS**: `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`
- **SQL**: always parameterized, use `query<T>()` / `queryOne<T>()` / `executeInTransaction()`
- **Validation**: Zod schemas in `src/features/reviews/validators/` and `src/lib/validation.ts`
- **API routes**: thin handlers in `app/api/`, logic in `server/routers/` → delegates to services
- **Explicit type Returns** Always create a typed object first before you return it
- **DI**: Constructor injection via `server/container.ts` — no module-level singletons in features
- **Types**: Global shared types in `src/types/`, feature types in `src/features/*/types.ts`
- **Repositories**: `src/lib/db/repositories/` with `BaseRepository` abstract class
- **Services**: `src/features/*/services/` — class-based with injected dependencies

## Architecture

```
src/
├── app/                          # Next.js routing layer
├── features/                     # Domain modules (DI-based)
│   ├── pipeline/                 # AI agent processing engine
│   │   ├── agents/               # AgentFactoryService, PolicyAgent interface
│   │   ├── guardrails/           # TokenTracker, PII redactor
│   │   └── services/             # Orchestrator, Router, Aggregator, Explainer
│   ├── reviews/                  # Submit, track, display reviews
│   │   ├── services/             # ReviewService
│   │   └── validators/           # Zod schemas
│   └── policies/                 # Policy management
├── server/                       # Backend infrastructure
│   ├── container.ts              # Composition root (wires all DI)
│   ├── trpc.ts                   # tRPC context with container
│   ├── routers/                  # Thin tRPC routers → delegate to services
│   ├── queue/                    # QueueProvider interface + BullMQ
│   └── worker.ts                 # Queue worker using container
├── lib/                          # Shared infrastructure
│   ├── db/
│   │   ├── client.ts             # Pool, query<T>, queryOne<T>, executeInTransaction
│   │   ├── base.repository.ts    # Abstract BaseRepository
│   │   ├── repositories/         # Concrete repos (Review, Listing, Policy, etc.)
│   │   └── migrations/
│   ├── llm/                      # ILLMService interface + LLMService (Claude)
│   ├── utils/embedding.ts        # Gemini embedding
│   ├── errors.ts                 # Custom error hierarchy
│   ├── redis.ts                  # Redis client
│   ├── queue.ts                  # ReviewJobData type + queue name
│   └── validation.ts             # Shared Zod schemas
├── types/                        # Global shared types (db rows, API types)
├── config/                       # env.ts (validated env vars)
└── scripts/                      # migrate, seed
```

## Commands

```bash
npm run dev:full      # Docker + migrate + seed + dev server
npm run dev:migrate   # Run pending SQL migrations
npm run dev:seed      # Seed policy embeddings
npm run lint          # ESLint
npx vitest run        # Tests
npx tsc --noEmit      # Type check
```

## Docs — Read When Relevant

| Doc | Read when... |
|-----|-------------|
| `docs/service_architecture.md` | System design, request flow, env vars, tech stack |
| `docs/code_conventions.md` | Naming conventions, code patterns |
| `docs/folder_structure.md` | Creating files, where things belong |
