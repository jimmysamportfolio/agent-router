# tRPC Setup — Remaining Phases

Phase 1 (Foundation) is complete. Types, validation, tRPC init, catch-all route, client hooks, and health router are all in place and passing `tsc --noEmit`.

---

## Phase 2: Decisions Router

**Goal**: `submit` mutation (INSERT listing + review → enqueue → return reviewId) and `getStatus` query. Requires Redis/BullMQ setup.

### Files (in order)

| File | Action | Contents |
|------|--------|----------|
| `src/lib/redis.ts` | Create | ioredis singleton from `REDIS_URL` |
| `src/lib/queue.ts` | Create | `reviewQueue` (BullMQ Queue), `ReviewJobData` type, `enqueueReview()` |
| `src/server/trpc.ts` | Modify | Add `redis` + `enqueueReview` to context |
| `src/lib/db/queries/listings.ts` | Create | `insertListing(input): Promise<ListingRow>` |
| `src/lib/db/queries/reviews.ts` | Create | `insertReview(listingId): Promise<ReviewRow>`, `getReviewById(id): Promise<ReviewRow \| undefined>` |
| `src/server/routers/decisions.ts` | Create | See below |
| `src/server/root.ts` | Modify | Add `decisions: decisionsRouter` |

### `decisions.ts` key logic

```
submit mutation:
  1. executeInTransaction: INSERT listing → INSERT review (pending)
  2. ctx.enqueueReview({ reviewId, listingId })
  3. return { reviewId }

getStatus query:
  1. getReviewById(input) → NOT_FOUND or mapped output
```

Uses `executeInTransaction` with inline `client.query` for atomicity (keeps standalone query functions clean).

### Verify

- `npm run dev:full` (Docker for Redis + Postgres)
- POST `decisions.submit` with `{ title, description, category }` → returns `{ reviewId }`
- GET `decisions.getStatus` with reviewId → returns `{ status: "pending" }`
- Verify BullMQ job exists in Redis

### Test

- `tests/validation.test.ts` — schema edge cases (missing fields, too long, invalid URLs)

---

## Phase 3: Scans Router

**Goal**: `getById` query joining reviews + listings + violations.

### Files (in order)

| File | Action | Contents |
|------|--------|----------|
| `src/lib/db/queries/scans.ts` | Create | `getScanByReviewId(id)` — two queries: (1) review JOIN listing, (2) violations WHERE review_id. Maps to `ScanResultOutput` |
| `src/server/routers/scans.ts` | Create | `getById` query using `reviewIdSchema`, calls `getScanByReviewId`, throws NOT_FOUND if missing |
| `src/server/root.ts` | Modify | Add `scans: scansRouter` |

### Design note

Two separate queries (review+listing join, then violations) instead of one complex `array_agg` join — simpler, easier to maintain, negligible perf difference.

### Verify

- Submit a listing → query `scans.getById` with reviewId → returns review + listing + empty violations
- Test with nonexistent UUID → NOT_FOUND error
- `npx tsc --noEmit` passes
- `npx vitest run` passes

---

## Resolved Decisions

- **Health router**: Keep permanently (useful for monitoring/health probes)
- **Input shape**: Bare `z.string().uuid()` — simpler, less boilerplate
- **SSR client**: Deferred — relative `/api/trpc` for browser only. Server components can call db queries directly
