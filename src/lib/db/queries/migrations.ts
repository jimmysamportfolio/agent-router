import { query, executeInTransaction } from "@/lib/db/pool";

export async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await query<{ name: string }>(
    "SELECT name FROM _migrations ORDER BY name"
  );
  return new Set(rows.map((row) => row.name));
}

export async function applyMigration(
  name: string,
  sql: string
): Promise<void> {
  await executeInTransaction(async (connection) => {
    await connection.query(sql);
    await connection.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
  });
}
