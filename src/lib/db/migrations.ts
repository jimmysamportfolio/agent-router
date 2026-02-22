import { query, executeInTransaction } from "@/lib/db/pool";

const CREATE_MIGRATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
)`;
const GET_APPLIED_MIGRATIONS_SQL = `SELECT name FROM _migrations ORDER BY name`;
const INSERT_MIGRATION_SQL = `INSERT INTO _migrations (name) VALUES ($1)`;

export async function ensureMigrationsTable(): Promise<void> {
  await query(CREATE_MIGRATIONS_TABLE_SQL);
}

export async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await query<{ name: string }>(GET_APPLIED_MIGRATIONS_SQL);
  return new Set(rows.map((row) => row.name));
}

export async function applyMigration(name: string, sql: string): Promise<void> {
  await executeInTransaction(async (connection) => {
    await connection.query(sql);
    await connection.query(INSERT_MIGRATION_SQL, [name]);
  });
}
