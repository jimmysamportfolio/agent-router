# Database Best Practices

Patterns for PostgreSQL with raw SQL (`pg` driver). Focuses on structural
decisions and reusable templates — not general SQL knowledge.

---

## File Organization

Repositories live inside their owning feature — co-located in the service file
(primary pattern) or as a standalone file at the feature root.

```
src/
├── lib/db/
│   ├── client.ts              # Pool singleton, typed query helpers
│   ├── base.repository.ts     # Abstract base with shared DB operations
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_add_orders.sql
├── features/<domain>/
│   ├── services/
│   │   └── order.service.ts   # Service + co-located OrderRepository
│   └── scan.repository.ts     # Standalone repo (no owning service)
├── scripts/
│   └── migrate.ts
└── types/
    └── db.ts                  # Row types matching tables
```

Only truly shared DB infrastructure (`client.ts`, `base.repository.ts`,
migrations) lives in `lib/db/`. Feature-specific data access always lives
in the feature folder.

---

## Connection Pool

Single `Pool` instance for the entire app. Never create connections per query.

```typescript
// lib/db/client.ts
import { Pool, type PoolConfig, type QueryResultRow } from "pg";
import { env } from "@/config/env";

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
};

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

export async function query<T extends QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
```

Pool sizing: web server ~20, background worker ~5–10, serverless → use
PgBouncer or RDS Proxy. Total across all services must stay under
PostgreSQL's `max_connections`.

Always drain on shutdown:

```typescript
process.on("SIGTERM", async () => { await closePool(); process.exit(0); });
```

---

## Base Repository

The key structural piece — provides typed queries and transaction binding
via `withClient()`.

```typescript
// lib/db/base.repository.ts
import { query, queryOne } from "./client";
import type { PoolClient, QueryResultRow } from "pg";

export abstract class BaseRepository {
  protected async query<T extends QueryResultRow>(
    sql: string,
    params?: unknown[],
    client?: PoolClient,
  ): Promise<T[]> {
    if (client) {
      const { rows } = await client.query<T>(sql, params);
      return rows;
    }
    return query<T>(sql, params);
  }

  protected async queryOne<T extends QueryResultRow>(
    sql: string,
    params?: unknown[],
    client?: PoolClient,
  ): Promise<T | undefined> {
    if (client) {
      const { rows } = await client.query<T>(sql, params);
      return rows[0];
    }
    return queryOne<T>(sql, params);
  }
}
```

Concrete repositories extend this and pass an optional `client` parameter
through for transaction support. Each feature owns its own repositories.

---

## Transactions

Reusable helper — handles BEGIN/COMMIT/ROLLBACK and client release.

```typescript
// lib/db/transaction.ts
import { pool } from "./client";
import type { PoolClient } from "pg";

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

Usage — bind repositories to the transaction client:

```typescript
await withTransaction(async (client) => {
  const txOrders = this.orders.withClient(client);
  const txPayments = this.payments.withClient(client);
  await txPayments.recordCharge(orderId, amount);
  await txOrders.updateStatus(orderId, "confirmed");
});
// External calls (email, webhooks) go AFTER the transaction
```

Key rules: keep transactions short, never `await` external calls (HTTP,
email, queues) inside them, don't nest transactions.

---

## Migrations

Numbered SQL files, tracked in a `_migrations` table. Each runs once.

```typescript
// scripts/migrate.ts
import { pool, closePool } from "@/lib/db/client";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(__dirname, "../lib/db/migrations");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: applied } = await pool.query<{ name: string }>(
    "SELECT name FROM _migrations ORDER BY name"
  );
  const appliedSet = new Set(applied.map((r) => r.name));

  const pending = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !appliedSet.has(f));

  if (pending.length === 0) { console.log("No pending migrations."); return; }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`  ✗ ${file} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(`Applied ${pending.length} migration(s).`);
}

migrate().catch((e) => { console.error(e); process.exit(1); }).finally(closePool);
```

Migration rules:
- Never edit an applied migration — create a new one to fix mistakes
- One concern per file
- Separate index migrations (for `CREATE INDEX CONCURRENTLY`)
- Use `TIMESTAMPTZ` not `TIMESTAMP`
- Add `created_at`/`updated_at` to every table
- Store money as integers (cents), not floats
- Include CHECK constraints and defaults in CREATE TABLE

---

## Row Types

Mirror your tables exactly in `types/db.ts`. Match column names — rename
in the service layer if needed, not here.

```typescript
export interface OrderRow {
  id: string;
  user_id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  total_cents: number;
  avatar_url: string | null;  // explicit nulls for nullable columns
  created_at: Date;
  updated_at: Date;
}
```