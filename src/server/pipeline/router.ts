import { embedTexts } from "@/lib/utils/embedding";
import { getActiveAgentConfigsByTenant } from "@/lib/db/queries/agent-configs";
import { searchTenantPoliciesByEmbedding } from "@/lib/db/queries/tenant-policies";
import type { AgentConfigRow, ListingRow } from "@/lib/types";
import type {
  AgentConfig,
  AgentDispatchPlan,
  AgentOptions,
  PolicyMatch,
} from "@/server/pipeline/types";

function toAgentConfig(row: AgentConfigRow): AgentConfig {
  const config: AgentConfig = {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    displayName: row.display_name,
    systemPromptTemplate: row.system_prompt_template,
    policySourceFiles: row.policy_source_files,
    options: row.options as AgentOptions,
  };
  return config;
}

function toPolicyMatches(
  results: { source_file: string; content: string; similarity: number }[],
): PolicyMatch[] {
  return results.map((r) => {
    const match: PolicyMatch = {
      sourceFile: r.source_file,
      content: r.content,
      similarity: r.similarity,
    };
    return match;
  });
}

export async function planAgentDispatch(
  listing: ListingRow,
  tenantId: string,
): Promise<AgentDispatchPlan[]> {
  const configRows = await getActiveAgentConfigsByTenant(tenantId);
  if (configRows.length === 0) return [];

  const searchText = `${listing.title} ${listing.description}`;
  const [embedding] = await embedTexts([searchText]);
  if (!embedding) {
    return configRows.map((row) => {
      const plan: AgentDispatchPlan = {
        agentConfig: toAgentConfig(row),
        relevantPolicies: [],
      };
      return plan;
    });
  }

  const plans = await Promise.all(
    configRows.map(async (row): Promise<AgentDispatchPlan> => {
      const results = await searchTenantPoliciesByEmbedding(
        tenantId,
        embedding,
        row.policy_source_files,
        10,
      );
      const plan: AgentDispatchPlan = {
        agentConfig: toAgentConfig(row),
        relevantPolicies: toPolicyMatches(results),
      };
      return plan;
    }),
  );

  return plans;
}
