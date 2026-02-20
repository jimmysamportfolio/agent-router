# Error Handling

## Principles

- **Fail fast** — validate required env vars at module load time
- **Descriptive errors** — include context values in messages
- **Transaction safety** — always rollback on failure, log rollback errors separately
- **Let it crash** — don't swallow errors; re-throw after cleanup

## Custom Error Types (`lib/errors.ts`)

All custom errors extend `AppError`, which extends `Error` and adds a `code` field.

| Class | Code | When to use |
|-------|------|-------------|
| `ConfigError` | `CONFIG_MISSING` | Missing required environment variable |
| `ValidationError` | `VALIDATION_FAILED` | Bad data passed to internal functions |
| `DatabaseError` | `DB_UNEXPECTED` | DB operation returned unexpected result (e.g. no row from `RETURNING *`) |
| `InvariantError` | `INVARIANT_VIOLATED` | "Should never happen" assertions on library/runtime guarantees |

All custom errors support `cause` chaining via the `options` parameter.

## Patterns

### Env validation at module load
```typescript
import { ConfigError } from "@/lib/errors";
if (!process.env.DATABASE_URL) {
  throw new ConfigError("DATABASE_URL");
}
```

### Input validation before DB calls
```typescript
import { ValidationError } from "@/lib/errors";
if (chunks.length !== embeddings.length) {
  throw new ValidationError(`chunks/embeddings length mismatch: ${chunks.length} vs ${embeddings.length}`);
}
```

### Unexpected DB results
```typescript
import { DatabaseError } from "@/lib/errors";
const row = await queryOne<ReviewRow>(sql, [id]);
if (!row) throw new DatabaseError("Failed to insert review");
```

### Invariant assertions
```typescript
import { InvariantError } from "@/lib/errors";
if (!job.id) throw new InvariantError("BullMQ did not assign a job ID");
```

### tRPC errors
```typescript
import { TRPCError } from "@trpc/server";
throw new TRPCError({ code: "NOT_FOUND", message: `Review ${id} not found` });
```
Codes: `BAD_REQUEST`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR`

tRPC errors are used in routers only — they map directly to HTTP status codes and should not be replaced with custom errors.

## Pipeline Resilience

- **LLM calls**: retry with exponential backoff, timeout per call, `failed` status on persistent failure
- **Circuit breaker** (`guardrails/circuit-breaker.ts`): track failures → open after threshold → half-open after cooldown
- **Budget guard** (`guardrails/budget.ts`): track token usage → `escalated` if exceeded

## Review Status Flow

```
pending → routing → scanning → aggregating → complete
                                           → escalated (budget/confidence)
          any stage ──────────────────────→ failed (unrecoverable)
```

## Logging

- `console.error` for unexpected failures
- Include error context (operation, inputs)
- Never log secrets, API keys, or PII
