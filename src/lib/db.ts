import { Pool, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export { pool };