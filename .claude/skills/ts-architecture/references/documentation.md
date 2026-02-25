# Documentation Conventions

The type system is already documentation. Comments fill gaps types can't
express: **why** something exists, **tradeoffs** made, and **how** a
module fits into the larger system.

---

## What to Document vs. Skip

| Document | Skip |
|----------|------|
| Public interface contracts (expectations, failure modes) | Private methods with clear names |
| Non-obvious "why" decisions and tradeoffs | Self-explanatory getters/setters |
| Complex algorithms or business rules | Obvious parameter descriptions |
| Module-level purpose (`index.ts` header) | Code that restates the implementation |
| Gotchas, edge cases, known limitations | Every single function |

---

## Format

Use TSDoc (`/** */`). Key tags: `@param`, `@throws`, `@remarks`, `@returns`.

Interfaces — document the contract, not the shape:

```typescript
/**
 * Persists and retrieves orders.
 *
 * Implementations must be safe for concurrent requests.
 * Methods throw {@link NotFoundError} for missing resources
 * except `findById` which returns null.
 */
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  /** @throws {@link ConflictError} on duplicate idempotency key */
  insert(data: CreateOrderInput): Promise<Order>;
}
```

Classes — document tradeoffs, not implementation:

```typescript
/**
 * Sliding-window rate limiter backed by Redis sorted sets.
 *
 * Chose sorted sets over token bucket because we need per-second
 * granularity for the webhook endpoint.
 */
export class RateLimiter { /* ... */ }
```

---

## Feature READMEs

For complex features (20+ files), a short `README.md` in the feature
folder beats scattered comments:

```markdown
# Pipeline
## Architecture
Router → Agents (parallel) → Aggregator → Explainer
## Adding a New Agent
1. Implement `PolicyAgent` in `agents/`
2. Register in `services/orchestrator.ts`
## Config
- `PIPELINE_BUDGET_LIMIT` — max tokens per review
```

---

## Anti-Patterns

- Restating the code in a comment
- `@param id - The ID` (adds nothing)
- Stale comments that contradict the code
- Changelog comments (use git)