# Agent Router

Policy compliance system for marketplace listings. LLM agents (Claude) + vector search (pgvector/Gemini) + async queue (BullMQ/Redis).

## Quick Reference

- **Imports**: `@/` alias for `src/`
- **No `any`**, unused vars prefixed `_`
- **Strict TS**: `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`
- **SQL**: always parameterized, use `query<T>()` / `queryOne<T>()` / `executeInTransaction()`
- **Validation**: Zod schemas in `src/lib/validation.ts`, shared client + server
- **API routes**: thin handlers in `app/api/`, logic in `server/`

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
| `docs/database_schema.md` | Writing queries, migrations, table schemas |
| `docs/code_conventions.md` | Naming conventions, code patterns |
| `docs/error_handling.md` | Error handling, pipeline resilience |
| `docs/testing.md` | Writing or running tests |
| `docs/folder_structure.md` | Creating files, where things belong |

## Workflow

### Planning
1. For new features, verify you're on a feature branch (`feat/`, `fix/`, etc.) — if on `main`, create and switch to one before writing code
2. Read only the docs relevant to the task (see table above)
3. Present plan: files to edit → high-level summary → details → questions (if any)
4. If implementation differs from docs, explain why. If approved, update the docs

### Testing
1. Write tests alongside or immediately after implementation — not as a separate step
2. Run `npx vitest run` to verify before committing
3. See `docs/testing.md` for conventions
