# Agent Router — Refactorization Progress

## Phase 1: Interfaces & Base Repository
- [x] Create `src/lib/db/base.repository.ts`
- [x] Create repository interfaces in `src/lib/db/repositories/`
- [x] Create `src/lib/llm/llm.interface.ts`
- [x] Verify: `npx tsc --noEmit`

## Phase 2: Repository Implementations + Rename pool → client
- [x] Create `client.ts` alongside `pool.ts`, update base.repository
- [x] Create repository classes extending BaseRepository
- [x] Create `src/lib/db/repositories/index.ts` barrel
- [x] Verify: `npx tsc --noEmit`

## Phase 3: Infrastructure Services (LLM + Config)
- [x] Create `src/lib/llm/claude.client.ts` (LLMService class)
- [x] Create `src/lib/llm/index.ts` barrel
- [x] Create `src/config/env.ts`
- [x] Verify: `npx tsc --noEmit`

## Phase 4: Domain Services (Pipeline + Reviews + Policies)
- [x] Create `src/features/pipeline/` (types, agents, guardrails, services)
- [x] Create `src/features/reviews/` (types, validators, services)
- [x] Create `src/features/policies/` (types, services)
- [x] Verify: `npx tsc --noEmit`

## Phase 5: Shared Types + Move types/ to src root
- [x] Move `src/lib/types/` → `src/types/`
- [x] Update all imports from `@/lib/types` → `@/types`
- [x] Delete old `src/lib/types/`
- [x] Verify: `npx tsc --noEmit`

## Phase 6: Composition Root + API Layer Update
- [x] Create `src/server/container.ts`
- [x] Update tRPC context
- [x] Update routers to use container
- [x] Move queue files to `src/server/queue/`
- [x] Update worker
- [x] Verify: `npx tsc --noEmit` + `npm run lint`

## Phase 7: Test Migration + Cleanup
- [x] Rewrite tests to use DI (no vi.mock for factory/router tests)
- [x] Delete old files (`server/pipeline/`, `lib/db/queries/`, `lib/types/`)
- [x] Update scripts to use new imports
- [x] Verify: `npx tsc --noEmit` + `npm run lint` + `npx vitest run`

## Results
- **56/56 tests passing**
- **0 lint errors**
- **0 type errors**
- Old `server/pipeline/`, `lib/db/queries/`, `lib/types/` deleted
- `pool.ts` kept alongside `client.ts` (scripts still use it)
