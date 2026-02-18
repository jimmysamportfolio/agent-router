import { Pool, PoolClient, QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX ?? "10", 10),
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONN_TIMEOUT_MS ?? "5000",
    10
  ),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "30000", 10),
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

export async function executeInTransaction<T>(
  execute: (client: PoolClient) => Promise<T>
): Promise<T> {
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const result = await execute(connection);
    await connection.query("COMMIT");
    return result;
  } catch (originalError) {
    try {
      await connection.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("ROLLBACK failed:", rollbackError);
    }
    throw originalError;
  } finally {
    connection.release();
  }
}

export { pool };
