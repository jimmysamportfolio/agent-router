import { BaseRepository } from "@/lib/db/base.repository";
import { DatabaseError, InvariantError, ValidationError } from "@/lib/errors";
import { agentOptionsSchema } from "@/lib/validation";
import type { AgentConfigRow, ListingRow } from "@/types";
import type {
  AgentConfig,
  AgentDispatchPlan,
  AgentOptions,
} from "@/features/pipeline/types";
import type { PolicyMatch } from "@/features/policies/types";

// ── Embedding Service Interface ─────────────────────────────────────

export interface IEmbeddingService {
  embedTexts(texts: string[]): Promise<number[][]>;
}

// ── Policy Repository ───────────────────────────────────────────────

interface PolicySearchRow {
  source_file: string;
  content: string;
  similarity: number;
}

export interface IPolicyRepository {
  searchByEmbedding(
    tenantId: string,
    embedding: number[],
    sourceFiles: string[],
    limit?: number,
  ): Promise<PolicyMatch[]>;
}

const SEARCH_ALL_SQL = `WITH q AS (SELECT $1::vector AS v)
  SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
  FROM tenant_policy_chunks, q
  WHERE tenant_id = $2
  ORDER BY embedding <=> q.v
  LIMIT $3`;

const SEARCH_BY_FILES_SQL = `WITH q AS (SELECT $1::vector AS v)
  SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
  FROM tenant_policy_chunks, q
  WHERE tenant_id = $2 AND source_file = ANY($3)
  ORDER BY embedding <=> q.v
  LIMIT $4`;

function toPolicyMatch(row: PolicySearchRow): PolicyMatch {
  const match: PolicyMatch = {
    sourceFile: row.source_file,
    content: row.content,
    similarity: row.similarity,
  };
  return match;
}

export class PolicyRepository
  extends BaseRepository
  implements IPolicyRepository
{
  async searchByEmbedding(
    tenantId: string,
    embedding: number[],
    sourceFiles: string[],
    limit = 5,
  ): Promise<PolicyMatch[]> {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new ValidationError("embedding must be a non-empty array");
    }

    const vector = `[${embedding.join(",")}]`;

    if (sourceFiles.length === 0) {
      const rows = await this.query<PolicySearchRow>(SEARCH_ALL_SQL, [
        vector,
        tenantId,
        limit,
      ]);
      return rows.map(toPolicyMatch);
    }

    const rows = await this.query<PolicySearchRow>(SEARCH_BY_FILES_SQL, [
      vector,
      tenantId,
      sourceFiles,
      limit,
    ]);
    return rows.map(toPolicyMatch);
  }
}

// ── Agent Config Repository ─────────────────────────────────────────

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
      options: Record<string, unknown>;
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
      options: Record<string, unknown>;
    },
  ): Promise<AgentConfigRow> {
    const row = await this.queryOne<AgentConfigRow>(INSERT_SQL, [
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

// ── Router Service Helpers ──────────────────────────────────────────

const DEFAULT_POLICY_SEARCH_LIMIT = 10;

function parseAgentOptions(raw: unknown): AgentOptions {
  const parsed = agentOptionsSchema.parse(raw);
  const options: AgentOptions = {};
  if (parsed.skipRedaction !== undefined)
    options.skipRedaction = parsed.skipRedaction;
  if (parsed.maxTokens !== undefined) options.maxTokens = parsed.maxTokens;
  return options;
}

function toAgentConfig(row: AgentConfigRow): AgentConfig {
  const config: AgentConfig = {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    displayName: row.display_name,
    systemPromptTemplate: row.system_prompt_template,
    policySourceFiles: row.policy_source_files,
    options: parseAgentOptions(row.options),
  };
  return config;
}

function buildSearchText(listing: ListingRow): string {
  return `${listing.title} ${listing.description}`.trim();
}

// ── Router Service ──────────────────────────────────────────────────

export class PolicyRouterService {
  constructor(
    private readonly agentConfigRepo: IAgentConfigRepository,
    private readonly policyRepo: IPolicyRepository,
    private readonly embeddingService: IEmbeddingService,
  ) {}

  async planAgentDispatch(
    listing: ListingRow,
    tenantId: string,
  ): Promise<AgentDispatchPlan[]> {
    const configRows = await this.agentConfigRepo.getActiveByTenant(tenantId);
    if (configRows.length === 0) {
      throw new InvariantError(
        `No active agent configurations for tenant: ${tenantId}`,
      );
    }

    const searchText = buildSearchText(listing);
    const [embedding] = await this.embeddingService.embedTexts([searchText]);

    if (!embedding) {
      throw new InvariantError("Failed to generate embedding for listing");
    }

    const dispatchPlans: AgentDispatchPlan[] = await Promise.all(
      configRows.map(async (row): Promise<AgentDispatchPlan> => {
        const searchResults = await this.policyRepo.searchByEmbedding(
          tenantId,
          embedding,
          row.policy_source_files,
          DEFAULT_POLICY_SEARCH_LIMIT,
        );

        const plan: AgentDispatchPlan = {
          agentConfig: toAgentConfig(row),
          relevantPolicies: searchResults,
        };
        return plan;
      }),
    );

    return dispatchPlans;
  }
}
