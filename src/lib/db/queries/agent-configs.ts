import { query, queryOne } from "@/lib/db/pool";
import { DatabaseError } from "@/lib/errors";
import type { AgentConfigRow } from "@/lib/types";

const GET_ACTIVE_AGENT_CONFIGS_BY_TENANT_SQL = `SELECT * FROM agent_configs WHERE tenant_id = $1 AND is_active = true ORDER BY name`;

const GET_AGENT_CONFIG_BY_ID_SQL = `SELECT * FROM agent_configs WHERE id = $1`;

const INSERT_AGENT_CONFIG_SQL = `INSERT INTO agent_configs (tenant_id, name, display_name, system_prompt_template, policy_source_files, options) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;

const DEACTIVATE_AGENT_CONFIG_SQL = `UPDATE agent_configs SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`;

export async function getActiveAgentConfigsByTenant(
  tenantId: string,
): Promise<AgentConfigRow[]> {
  return query<AgentConfigRow>(GET_ACTIVE_AGENT_CONFIGS_BY_TENANT_SQL, [
    tenantId,
  ]);
}

export async function getAgentConfigById(
  id: string,
): Promise<AgentConfigRow | undefined> {
  return queryOne<AgentConfigRow>(GET_AGENT_CONFIG_BY_ID_SQL, [id]);
}

export async function insertAgentConfig(
  tenantId: string,
  config: {
    name: string;
    displayName: string;
    systemPromptTemplate: string;
    policySourceFiles: string[];
    options: Record<string, unknown>;
  },
): Promise<AgentConfigRow> {
  const row = await queryOne<AgentConfigRow>(INSERT_AGENT_CONFIG_SQL, [
    tenantId,
    config.name,
    config.displayName,
    config.systemPromptTemplate,
    config.policySourceFiles,
    config.options,
  ]);
  if (!row) throw new DatabaseError("Failed to insert agent config");
  return row;
}

export async function updateAgentConfig(
  id: string,
  updates: Partial<{
    displayName: string;
    systemPromptTemplate: string;
    policySourceFiles: string[];
    options: Record<string, unknown>;
    isActive: boolean;
  }>,
): Promise<AgentConfigRow> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (updates.displayName !== undefined) {
    fields.push(`display_name = $${paramIndex++}`);
    params.push(updates.displayName);
  }
  if (updates.systemPromptTemplate !== undefined) {
    fields.push(`system_prompt_template = $${paramIndex++}`);
    params.push(updates.systemPromptTemplate);
  }
  if (updates.policySourceFiles !== undefined) {
    fields.push(`policy_source_files = $${paramIndex++}`);
    params.push(updates.policySourceFiles);
  }
  if (updates.options !== undefined) {
    fields.push(`options = $${paramIndex++}`);
    params.push(updates.options);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    params.push(updates.isActive);
  }

  if (fields.length === 0) {
    throw new DatabaseError("No fields to update");
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE agent_configs SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;

  const row = await queryOne<AgentConfigRow>(sql, params);
  if (!row) throw new DatabaseError("Failed to update agent config");
  return row;
}

export async function deactivateAgentConfig(
  id: string,
): Promise<AgentConfigRow> {
  const row = await queryOne<AgentConfigRow>(DEACTIVATE_AGENT_CONFIG_SQL, [id]);
  if (!row) throw new DatabaseError("Failed to deactivate agent config");
  return row;
}
