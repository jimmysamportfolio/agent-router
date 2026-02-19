# Code Conventions

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Functions/variables | camelCase | `queryOne`, `chunkPolicy` |
| Types/interfaces | PascalCase | `PolicyChunk`, `ReviewRow` |
| Constants | UPPER_SNAKE_CASE | `EMBEDDING_MODEL`, `BATCH_LIMIT` |
| DB columns | snake_case | `source_file`, `chunk_index` |
| DB tables | snake_case plural | `policy_chunks`, `webhook_registrations` |
| Enum types | snake_case | `review_status`, `verdict` |
| Files | kebab-case | `seed-policies.ts`, `circuit-breaker.ts` |
| Event handlers | `handle` prefix | `handleSubmit`, `handleClick` |

## Style

- **Prefer `interface` over `type`** for object shapes (use `type` only for unions, intersections, and aliases)

## Patterns

- **Early returns** for validation and edge cases — avoid nested guard clauses
- **Exports at top, private helpers below** (see `policies.ts`)
- **Constants at module top** as `const`, group related ones together (see `embedding.ts`)
- **One function per operation** in `lib/db/queries/` files
- **SQL lives in query files** (`lib/db/queries/`), never inline in routers or handlers. Query functions accept an optional `PoolClient` param for transaction support
- **Routers are thin** — validate input, call query functions, format output. No raw SQL
- **`lib/` has no React imports** — shared between frontend and backend
- **Descriptive variable and function names** prefer over long comments, and never abbreviate

## Formatting

- **Prettier** for auto-formatting (integrated with ESLint via `eslint-config-prettier`)
