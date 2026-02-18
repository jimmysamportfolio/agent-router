import { pool, query } from "@/lib/db/pool";

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
  return new Set(rows.map((r) => r.name));
}

export async function applyMigration(
  name: string,
  sql: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("ROLLBACK failed:", rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}
