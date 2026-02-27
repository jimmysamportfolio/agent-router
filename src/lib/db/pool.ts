import { Pool, PoolClient, QueryResultRow } from "pg";
import { getDbEnv } from "@/config/env";

let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) return pool;

  const db = getDbEnv();
  pool = new Pool({
    connectionString: db.DATABASE_URL,
    max: db.DB_POOL_MAX,
    connectionTimeoutMillis: db.DB_CONN_TIMEOUT_MS,
    idleTimeoutMillis: db.DB_IDLE_TIMEOUT_MS,
  });

  pool.on("error", (err) => {
    console.error("[DB Pool] idle client error:", err);
  });

  return pool;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function executeInTransaction<T>(
  execute: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const connection = await getPool().connect();
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

export { getPool };
