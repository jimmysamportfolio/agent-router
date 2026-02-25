import type { PoolClient } from "pg";
import { query } from "@/lib/db/pool";
import type { ViolationRow } from "@/lib/types";
import type { AgentViolation } from "@/server/pipeline/types";

export async function insertViolations(
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
    const { rows } = await client.query<ViolationRow>(sql, params);
    return rows;
  }

  return query<ViolationRow>(sql, params);
}
