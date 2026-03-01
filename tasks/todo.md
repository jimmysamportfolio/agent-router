# Architecture Reorganization: Feature-First Ownership

## Phase 3: Move remaining types out of `src/types/`
- [x] 3.1 Move `AgentConfigRow` → `pipeline/types.ts`, `TenantPolicyChunkRow` → `policies/types.ts`
- [x] 3.2 Move API types from `src/types/api.ts` → `reviews/types.ts`, delete `api.ts`
- [x] 3.3 Update `src/types/index.ts` to only export `TenantRow`
- [x] 3.4 Fix all imports referencing moved types

## Phase 4: Move feature-specific validation schemas
- [x] 4.1 Create `reviews/validators.ts` with `submitListingSchema`, `reviewIdSchema`
- [x] 4.2 Create `pipeline/validators.ts` with `agentResultSchema`, `createAgentConfigSchema`
- [x] 4.3 Slim `src/lib/validation.ts` to shared enum schemas only
- [x] 4.4 Update all imports

## Phase 5: Move tRPC routers into features
- [x] 5.1 Create `reviews/router.ts` merging decisions + scans routers
- [x] 5.2 Delete old router files
- [x] 5.3 Update `src/server/root.ts`

## Phase 6: Move worker into reviews feature
- [x] 6.1 Move `worker.ts` → `reviews/worker.ts`
- [x] 6.2 Move `ReviewJobData` → `reviews/types.ts`
- [x] 6.3 Make queue interface generic
- [x] 6.4 Move `server/queue/` → `lib/queue/`

## Phase 7: Extract policy chunking from embedding utility
- [x] 7.1 Create `policies/services/chunker.ts`
- [x] 7.2 Add `PolicyChunk` to `policies/types.ts`
- [x] 7.3 Slim `embedding.ts`
- [x] 7.4 Update `seed-policies.ts`

## Phase 8: Clean up cross-feature re-exports
- [x] 8.1 Clean `pipeline/index.ts`
- [x] 8.2 Clean `reviews/index.ts`
- [x] 8.3 Update `container.ts` imports

## Phase 9: Final verification
- [x] 9.1 `npx tsc --noEmit` passes
- [x] 9.2 `npm run lint` passes
- [x] 9.3 Tests — 6 pre-existing failures (were 19 before reorg). No regressions introduced.
- [x] 9.4 Audited shared dirs
- [x] 9.5 Audited barrel exports

## Review

All phases complete. The reorganization:
- Moved 19 type definitions, 4 validation schemas, 2 tRPC routers, 1 worker, and queue infra
- Fixed `AgentConfig.options` missing field (pre-existing bug exposed by move)
- Reduced test failures from 19 → 6 by fixing broken import paths
- Remaining 6 failures are pre-existing (test data missing `tenantId`, factory tests expect unimplemented features)
