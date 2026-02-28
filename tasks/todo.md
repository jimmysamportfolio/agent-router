# Refactor: Pure Pipeline, Feature Ownership, Simplification

## Phase 1: Dead Code & Duplication Removal
- [x] 1a. Delete `src/lib/db/pool.ts`, update imports to `@/lib/db/client`
- [x] 1b. Move `REVIEW_QUEUE_NAME` + `ReviewJobData` to `queue.interface.ts`, delete `src/lib/queue.ts`
- [x] 1c. Remove legacy `enqueueReview` from tRPC context
- [x] 1d. Delete `src/features/reviews/validators/`, update imports
- [x] 1e. Remove dead LLM types from `pipeline/types.ts`
- [x] 1f. Delete `src/features/policies/services/policy.service.ts`, update exports

## Phase 2: BaseRepository Client Unification
- [x] Add optional `client` param to `query()`/`queryOne()`, remove `queryWithClient`/`queryOneWithClient`
- [x] Simplify all repositories using the new pattern

## Phase 3: Repo Merging, Type Mapping & Embedding Service
- [x] 3a. Move PolicyMatch mapping into PolicyRepository
- [x] 3b. Merge PolicyRepository into router.ts
- [x] 3c. Merge AgentConfigRepository into router.ts
- [x] 3d. Move ReviewRepository into review.service.ts
- [x] 3e. Move ListingRepository into review.service.ts
- [x] 3f. Move ViolationRepository into review.service.ts
- [x] 3g. Move ScanRepository to `features/reviews/scan.repository.ts`
- [x] 3h. Delete `src/lib/db/repositories/` directory
- [x] 3i. Update all imports
- [x] 3j. Formalize IEmbeddingService as a proper class

## Phase 4: Constants Consolidation
- [x] Create `src/config/constants.ts`
- [x] Update imports for shared constants

## Phase 5: Aggregator as Injectable Service
- [x] Convert to `AggregatorService` class
- [x] Wire into DI container

## Phase 6: Pure Pipeline & Renames
- [x] 6a. Add `PipelineResult` type, clean up `AgentInput`
- [x] 6b. Transform PipelineService (remove DB access)
- [x] 6c. Update worker to handle DB ops
- [x] 6d. Update Container interface
- [x] 6e. Rename reviewService → submissionService on Container
- [x] 6f. Update barrel exports and tests

## Phase 7: Update ts-architecture Skill
- [x] Update SKILL.md code placement table
- [x] Update folder-structures.md
- [x] Update database.md

## Results
- **56/56 tests passing**
- **0 lint errors**
- **0 type errors**
- Deleted: `pool.ts`, `lib/queue.ts`, `validators/`, `policy.service.ts`, `lib/db/repositories/`, `reviews/types.ts`
- Created: `config/constants.ts`, `features/reviews/scan.repository.ts`
- PipelineService is now pure (no DB access) — worker handles all DB orchestration
- All repos co-located in feature folders
- AggregatorService is injectable via DI
