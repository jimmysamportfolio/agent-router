# Error Handling Patterns

Where errors live and the base class template. The model should generate
specific error subclasses (NotFoundError, ForbiddenError, etc.) as needed
from this foundation.

---

## Structure

```
src/
├── lib/errors/
│   ├── base.error.ts        # AppError base class
│   ├── http.errors.ts       # NotFoundError, ForbiddenError, etc.
│   ├── validation.error.ts  # Wraps Zod errors
│   └── index.ts             # Barrel export
├── lib/api/
│   └── api-error.ts         # Centralized error handler / formatter
└── features/<domain>/
    └── errors.ts            # Domain-specific errors (InsufficientFundsError, etc.)
```

Shared HTTP errors live in `lib/errors/`. Domain errors live in their feature.

---

## Base Error Class

All custom errors extend this. Provides a consistent structure for
serialization, error codes, and `instanceof` checks.

```typescript
// lib/errors/base.error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.context && { context: this.context }),
      },
    };
  }
}
```

Generate specific errors by extending `AppError` with descriptive `code`
strings and appropriate `statusCode`. Domain errors (like
`InvalidStatusTransitionError`) go in `features/<domain>/errors.ts`.

---

## Centralized Handler

One handler catches all errors and formats responses. Services just throw.

For Express/Fastify — use error middleware.
For Next.js — use a `withErrorHandling` wrapper:

```typescript
// lib/api/api-error.ts
import { AppError } from "@/lib/errors";
import { NextResponse } from "next/server";

export function withErrorHandling(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json(err.toJSON(), { status: err.statusCode });
      }
      console.error("Unhandled error:", err);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
        { status: 500 }
      );
    }
  };
}
```

---

## Result Pattern (Optional)

Use `Result<T>` instead of exceptions for expected failures that are
part of normal flow (validation, declined payments). Throw for truly
exceptional situations (not found, unauthorized, system failures).

```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };
```