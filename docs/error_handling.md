# Error Handling

## Principles

- **Fail fast** — validate required env vars at module load time
- **Descriptive errors** — include context values in messages
- **Transaction safety** — always rollback on failure, log rollback errors separately
- **Let it crash** — don't swallow errors; re-throw after cleanup

## Patterns

### Env validation at module load
```typescript
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
```

### Input validation before DB calls
```typescript
if (chunks.length !== embeddings.length) {
  throw new Error(`chunks/embeddings length mismatch: ${chunks.length} vs ${embeddings.length}`);
}
```

### tRPC errors
```typescript
import { TRPCError } from "@trpc/server";
throw new TRPCError({ code: "NOT_FOUND", message: `Review ${id} not found` });
```
Codes: `BAD_REQUEST`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR`

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
