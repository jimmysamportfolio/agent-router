import { query, queryOne } from "@/lib/db/client";
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
