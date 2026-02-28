import { InvariantError } from "@/lib/errors";
import type { ListingRow } from "@/features/listings";
import type { AgentDispatchPlan } from "@/features/pipeline/types";
import type { IEmbeddingService } from "@/lib/utils/embedding";
import type { IPolicyRepository } from "@/features/policies/policy.repository";
import type { IAgentConfigRepository } from "@/features/pipeline/agent-config.repository";
import { toAgentConfig } from "@/features/pipeline/agent-config.repository";

const DEFAULT_POLICY_SEARCH_LIMIT = 10;

function buildSearchText(listing: ListingRow): string {
  return `${listing.title} ${listing.description}`.trim();
}

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

        return {
          agentConfig: toAgentConfig(row),
          relevantPolicies: searchResults,
        };
      }),
    );

    return dispatchPlans;
  }
}
