import { query, queryOne } from "@/lib/db/client";
import type { PoolClient, QueryResultRow } from "pg";

export abstract class BaseRepository {
  protected query<T extends QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    return query<T>(sql, params);
  }

  protected queryOne<T extends QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<T | undefined> {
    return queryOne<T>(sql, params);
  }

  protected async queryWithClient<T extends QueryResultRow>(
    client: PoolClient,
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const { rows } = await client.query<T>(sql, params);
    return rows;
  }

  protected async queryOneWithClient<T extends QueryResultRow>(
    client: PoolClient,
    sql: string,
    params?: unknown[],
  ): Promise<T | undefined> {
    const { rows } = await client.query<T>(sql, params);
    return rows[0];
  }
}
