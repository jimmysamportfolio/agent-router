---
name: error-handling
description: >
  Error handling patterns and custom error types for the Agent Router project.
  Use when throwing errors, catching exceptions, writing try/catch blocks,
  creating tRPC error responses, validating inputs, handling DB failures,
  or working with the review pipeline's resilience patterns (circuit breaker, retries, budget guard).
---

# Error Handling Skill

## Principles

- **Fail fast** -- validate required env vars at module load time
- **Descriptive errors** -- include context values in messages
- **Transaction safety** -- always rollback on failure, log rollback errors separately
- **Let it crash** -- don't swallow errors; re-throw after cleanup

## Custom Error Types (`lib/errors.ts`)

All extend `AppError` (extends `Error`, adds `code` field). All support `cause` chaining via options param.

| Class | Code | When to use |
|-------|------|-------------|
| `ConfigError` | `CONFIG_MISSING` | Missing required environment variable |
| `ValidationError` | `VALIDATION_FAILED` | Bad data passed to internal functions |
| `DatabaseError` | `DB_UNEXPECTED` | DB operation returned unexpected result |
| `InvariantError` | `INVARIANT_VIOLATED` | "Should never happen" assertions |

## Patterns

```typescript
// Env validation at module load
import { ConfigError } from "@/lib/errors";
if (!process.env.DATABASE_URL) {
  throw new ConfigError("DATABASE_URL");
}

// Input validation before DB calls
import { ValidationError } from "@/lib/errors";
if (chunks.length !== embeddings.length) {
  throw new ValidationError(`chunks/embeddings length mismatch: ${chunks.length} vs ${embeddings.length}`);
}

// Unexpected DB results
import { DatabaseError } from "@/lib/errors";
const row = await queryOne<ReviewRow>(sql, [id]);
if (!row) throw new DatabaseError("Failed to insert review");

// Invariant assertions
import { InvariantError } from "@/lib/errors";
if (!job.id) throw new InvariantError("BullMQ did not assign a job ID");

// tRPC errors (routers only -- maps to HTTP status codes)
import { TRPCError } from "@trpc/server";
throw new TRPCError({ code: "NOT_FOUND", message: `Review ${id} not found` });
// Codes: BAD_REQUEST, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, INTERNAL_SERVER_ERROR
```

## Pipeline Resilience

- **LLM calls**: retry with exponential backoff, timeout per call, `failed` status on persistent failure
- **Circuit breaker** (`guardrails/circuit-breaker.ts`): track failures -> open after threshold -> half-open after cooldown
- **Budget guard** (`guardrails/budget.ts`): track token usage -> `escalated` if exceeded

## Review Status Flow

```
pending -> routing -> scanning -> aggregating -> complete
                                              -> escalated (budget/confidence)
         any stage -> failed (unrecoverable)
```

## Logging

- `console.error` for unexpected failures
- Include error context (operation, inputs)
- Never log secrets, API keys, or PII
