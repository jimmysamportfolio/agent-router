import type { PoolClient } from "pg";
import type { ViolationRow } from "@/types";
import { BaseRepository } from "@/lib/db/base.repository";
import { executeInTransaction } from "@/lib/db/client";

export interface AgentViolation {
  policySection: string;
  severity: string;
  description: string;
}

export interface IViolationRepository {
  insertMany(
    reviewId: string,
    violations: AgentViolation[],
    client?: PoolClient,
  ): Promise<ViolationRow[]>;
}

export class ViolationRepository
  extends BaseRepository
  implements IViolationRepository
{
  async insertMany(
    reviewId: string,
    violations: AgentViolation[],
    client?: PoolClient,
  ): Promise<ViolationRow[]> {
    if (violations.length === 0) return [];

    const params: unknown[] = [];
    const valuePlaceholders = violations.map((v) => {
      const offset = params.length + 1;
      params.push(reviewId, v.policySection, v.severity, v.description);
      return `($${offset}, $${offset + 1}, $${offset + 2}::severity, $${offset + 3})`;
    });

    const sql = `INSERT INTO violations (review_id, policy_section, severity, description)
       VALUES ${valuePlaceholders.join(", ")} RETURNING *`;

    if (client) {
      return this.queryWithClient<ViolationRow>(client, sql, params);
    }

    return executeInTransaction((txClient) =>
      this.queryWithClient<ViolationRow>(txClient, sql, params),
    );
  }
}
