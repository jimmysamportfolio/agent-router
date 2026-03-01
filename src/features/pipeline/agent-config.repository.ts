import { BaseRepository } from "@/lib/db/base.repository";
import { DatabaseError } from "@/lib/errors";
import type { AgentConfigRow } from "@/features/pipeline/types";
import type { AgentConfig } from "@/features/pipeline/types";

export interface IAgentConfigRepository {
  getActiveByTenant(tenantId: string): Promise<AgentConfigRow[]>;
  getById(id: string): Promise<AgentConfigRow | undefined>;
  insert(
    tenantId: string,
    config: {
      name: string;
      displayName: string;
      systemPromptTemplate: string;
      policySourceFiles: string[];
      options?: Record<string, unknown>;
    },
  ): Promise<AgentConfigRow>;
  update(
    id: string,
    updates: Partial<{
      displayName: string;
      systemPromptTemplate: string;
      policySourceFiles: string[];
      options: Record<string, unknown>;
      isActive: boolean;
    }>,
  ): Promise<AgentConfigRow>;
  deactivate(id: string): Promise<AgentConfigRow>;
}

const GET_ACTIVE_BY_TENANT_SQL = `SELECT * FROM agent_configs WHERE tenant_id = $1 AND is_active = true ORDER BY name`;
const GET_BY_ID_SQL = `SELECT * FROM agent_configs WHERE id = $1`;
const INSERT_SQL = `INSERT INTO agent_configs (tenant_id, name, display_name, system_prompt_template, policy_source_files, options) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
const DEACTIVATE_SQL = `UPDATE agent_configs SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`;

function toAgentConfig(row: AgentConfigRow): AgentConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    displayName: row.display_name,
    systemPromptTemplate: row.system_prompt_template,
    policySourceFiles: row.policy_source_files,
    options: row.options,
  };
}

export class AgentConfigRepository
  extends BaseRepository
  implements IAgentConfigRepository
{
  async getActiveByTenant(tenantId: string): Promise<AgentConfigRow[]> {
    return this.query<AgentConfigRow>(GET_ACTIVE_BY_TENANT_SQL, [tenantId]);
  }

  async getById(id: string): Promise<AgentConfigRow | undefined> {
    return this.queryOne<AgentConfigRow>(GET_BY_ID_SQL, [id]);
  }

  async insert(
    tenantId: string,
    config: {
      name: string;
      displayName: string;
      systemPromptTemplate: string;
      policySourceFiles: string[];
      options?: Record<string, unknown>;
    },
  ): Promise<AgentConfigRow> {
    const row = await this.queryOne<AgentConfigRow>(INSERT_SQL, [
      tenantId,
      config.name,
      config.displayName,
      config.systemPromptTemplate,
      config.policySourceFiles,
      config.options ?? {},
    ]);
    if (!row) throw new DatabaseError("Failed to insert agent config");
    return row;
  }

  async update(
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

    const row = await this.queryOne<AgentConfigRow>(sql, params);
    if (!row) throw new DatabaseError("Failed to update agent config");
    return row;
  }

  async deactivate(id: string): Promise<AgentConfigRow> {
    const row = await this.queryOne<AgentConfigRow>(DEACTIVATE_SQL, [id]);
    if (!row) throw new DatabaseError("Failed to deactivate agent config");
    return row;
  }
}

export { toAgentConfig };
