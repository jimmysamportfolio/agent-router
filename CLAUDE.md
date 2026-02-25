# Agent Router

Policy compliance system for marketplace listings. LLM agents (Claude) + vector search (pgvector/Gemini) + async queue (BullMQ/Redis).

## Quick Reference

- **Imports**: `@/` alias for `src/`
- **No `any`**, unused vars prefixed `_`
- **Strict TS**: `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`
- **SQL**: always parameterized, use `query<T>()` / `queryOne<T>()` / `executeInTransaction()`
- **Validation**: Zod schemas in `src/lib/validation.ts`, shared client + server
- **API routes**: thin handlers in `app/api/`, logic in `server/`
- **Explicit type Returns** Always create a typed object first before you return it


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

