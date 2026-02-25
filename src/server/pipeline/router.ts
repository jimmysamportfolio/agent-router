import { embedTexts } from "@/lib/utils/embedding";
import { getActiveAgentConfigsByTenant } from "@/lib/db/queries/agent-configs";
import { searchTenantPoliciesByEmbedding } from "@/lib/db/queries/tenant-policies";
import { InvariantError } from "@/lib/errors";
import { agentOptionsSchema } from "@/lib/validation";
import type { AgentConfigRow, ListingRow } from "@/lib/types";
import type {
  AgentConfig,
  AgentDispatchPlan,
  AgentOptions,
  PolicyMatch,
  PolicySearchRow,
} from "@/server/pipeline/types";

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

function toPolicyMatches(rows: PolicySearchRow[]): PolicyMatch[] {
  return rows.map((row) => {
    const match: PolicyMatch = {
      sourceFile: row.source_file,
      content: row.content,
      similarity: row.similarity,
    };
    return match;
  });
}

function buildSearchText(listing: ListingRow): string {
  return `${listing.title} ${listing.description}`;
}

export async function planAgentDispatch(
  listing: ListingRow,
  tenantId: string,
): Promise<AgentDispatchPlan[]> {
  const configRows = await getActiveAgentConfigsByTenant(tenantId);
  if (configRows.length === 0) {
    throw new InvariantError(
      `No active agent configurations for tenant: ${tenantId}`,
    );
  }

  const searchText = buildSearchText(listing);
  const [embedding] = await embedTexts([searchText]);

  if (!embedding) {
    throw new InvariantError("Failed to generate embedding for listing");
  }

  const dispatchPlans: AgentDispatchPlan[] = await Promise.all(
    configRows.map(async (row): Promise<AgentDispatchPlan> => {
      const searchResults = await searchTenantPoliciesByEmbedding(
        tenantId,
        embedding,
        row.policy_source_files,
        DEFAULT_POLICY_SEARCH_LIMIT,
      );

      const plan: AgentDispatchPlan = {
        agentConfig: toAgentConfig(row),
        relevantPolicies: toPolicyMatches(searchResults),
      };
      return plan;
    }),
  );

  return dispatchPlans;
}
