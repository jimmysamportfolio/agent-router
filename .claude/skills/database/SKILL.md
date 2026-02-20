---
name: database
description: >
  Database schema reference and query patterns for the Agent Router project.
  Use when writing SQL queries, creating migrations, working with DB tables,
  writing query functions in lib/db/queries/, referencing table schemas,
  inserting/updating rows, or doing vector similarity search.
---

# Database Skill

## Migration System

- SQL files in `src/lib/db/migrations/` numbered `NNN_name.sql`
- Tracked in `_migrations` table (name + applied_at)
- Run via `npm run dev:migrate`
- Each migration executes in a transaction
- Add new migrations with next sequential number


## Query Patterns

```typescript
// Basic queries
const rows = await query<MyRow>(sql, [param1, param2]);
const row = await queryOne<MyRow>(sql, [id]);

// Transactions
await executeInTransaction(async (client) => {
  await client.query(sql1, params1);
  await client.query(sql2, params2);
});
```

- Always parameterized (`$1`, `$2`, ...)
- Vector search: cast with `$1::vector`, use `<=>` for cosine distance
- Bulk inserts: build dynamic VALUES placeholders (see `policies.ts`)
- Query functions in `lib/db/queries/` accept optional `PoolClient` param for transaction support
- SQL lives in query files only, never inline in routers or handlers
