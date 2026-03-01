import { BaseRepository } from "@/lib/db/base.repository";
import { executeInTransaction } from "@/lib/db/client";
import { PoolClient } from "pg";

export type Severity = "low" | "medium" | "high" | "critical";

export interface AgentViolation {
  policySection: string;
  severity: string;
  description: string;
}

export interface ViolationRow {
  id: string;
  review_id: string;
  policy_section: string;
  severity: Severity;
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
  private static readonly INSERT_SQL = `INSERT INTO violations (review_id, policy_section, severity, description)
       VALUES {{PLACEHOLDERS}} RETURNING *`;

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

    const insertSql = ViolationRepository.INSERT_SQL.replace(
      "{{PLACEHOLDERS}}",
      valuePlaceholders.join(", "),
    );

    if (client) {
      return this.query<ViolationRow>(insertSql, params, client);
    }

    return executeInTransaction((txClient) =>
      this.query<ViolationRow>(insertSql, params, txClient),
    );
  }
}
