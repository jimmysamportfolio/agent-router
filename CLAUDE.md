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

## Commands

```bash
npm run dev:full      # Docker + migrate + seed + dev server
npm run dev:migrate   # Run pending SQL migrations
npm run dev:seed      # Seed policy embeddings
npm run lint          # ESLint
npx vitest run        # Tests
npx tsc --noEmit      # Type check
```
