import { vi } from "vitest";
import type { IAgentConfigRepository } from "@/features/pipeline/agent-config.repository";
import type { IPolicyRepository } from "@/features/policies/policy.repository";
import type { IEmbeddingService } from "@/lib/utils/embedding";
import { PolicyRouterService } from "@/features/pipeline/services/router";
import type { AgentConfigRow } from "@/features/pipeline/types";
import type { ListingRow } from "@/features/listings";

function makeListing(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "listing-1",
    tenant_id: "tenant-1",
    title: "Test Item",
    description: "A test listing",
    category: "General",
    image_urls: null,
    metadata: null,
    created_at: new Date(),
    ...overrides,
  };
}

function makeConfigRow(
  overrides: Partial<AgentConfigRow> = {},
): AgentConfigRow {
  return {
    id: "config-1",
    tenant_id: "tenant-1",
    name: "test-agent",
    display_name: "Test Agent",
    system_prompt_template: "You are a test agent.",
    policy_source_files: ["test.md"],
    options: {},
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createMocks() {
  const agentConfigRepo: IAgentConfigRepository = {
    getActiveByTenant: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  };

  const policyRepo: IPolicyRepository = {
    searchByEmbedding: vi
      .fn()
      .mockResolvedValue([
        { sourceFile: "test.md", content: "Test policy", similarity: 0.9 },
      ]),
  };

  const embeddingService: IEmbeddingService = {
    embedTexts: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  };

  return { agentConfigRepo, policyRepo, embeddingService };
}

describe("PolicyRouterService", () => {
  let mocks: ReturnType<typeof createMocks>;
  let routerService: PolicyRouterService;

  beforeEach(() => {
    mocks = createMocks();
    routerService = new PolicyRouterService(
      mocks.agentConfigRepo,
      mocks.policyRepo,
      mocks.embeddingService,
    );
  });

  it("returns dispatch plans for all active configs", async () => {
    const configs = [
      makeConfigRow({ id: "c1", name: "agent-a" }),
      makeConfigRow({ id: "c2", name: "agent-b" }),
    ];
    vi.mocked(mocks.agentConfigRepo.getActiveByTenant).mockResolvedValue(
      configs,
    );

    const plans = await routerService.planAgentDispatch(
      makeListing(),
      "tenant-1",
    );

    expect(plans).toHaveLength(2);
    expect(plans[0]!.agentConfig.name).toBe("agent-a");
    expect(plans[1]!.agentConfig.name).toBe("agent-b");
  });

  it("throws error when no active configs", async () => {
    vi.mocked(mocks.agentConfigRepo.getActiveByTenant).mockResolvedValue([]);

    await expect(
      routerService.planAgentDispatch(makeListing(), "tenant-1"),
    ).rejects.toThrow("No active agent configurations for tenant: tenant-1");
    expect(mocks.embeddingService.embedTexts).not.toHaveBeenCalled();
  });

  it("throws error when embedding fails", async () => {
    vi.mocked(mocks.agentConfigRepo.getActiveByTenant).mockResolvedValue([
      makeConfigRow(),
    ]);
    vi.mocked(mocks.embeddingService.embedTexts).mockResolvedValue([]);

    await expect(
      routerService.planAgentDispatch(makeListing(), "tenant-1"),
    ).rejects.toThrow("Failed to generate embedding for listing");
    expect(mocks.policyRepo.searchByEmbedding).not.toHaveBeenCalled();
  });

  it("passes correct source files to vector search", async () => {
    const config = makeConfigRow({
      policy_source_files: ["prohibited.md", "health.md"],
    });
    vi.mocked(mocks.agentConfigRepo.getActiveByTenant).mockResolvedValue([
      config,
    ]);

    await routerService.planAgentDispatch(makeListing(), "tenant-1");

    expect(mocks.policyRepo.searchByEmbedding).toHaveBeenCalledWith(
      "tenant-1",
      [0.1, 0.2, 0.3],
      ["prohibited.md", "health.md"],
      10,
    );
  });

  it("maps config rows to AgentConfig correctly", async () => {
    const config = makeConfigRow({
      id: "cfg-id",
      tenant_id: "t-1",
      name: "prohibited",
      display_name: "Prohibited Items",
      system_prompt_template: "Check prohibited items",
      policy_source_files: ["prohibited.md"],
      options: { skipRedaction: true },
    });
    vi.mocked(mocks.agentConfigRepo.getActiveByTenant).mockResolvedValue([
      config,
    ]);

    const plans = await routerService.planAgentDispatch(makeListing(), "t-1");

    expect(plans[0]!.agentConfig).toEqual({
      id: "cfg-id",
      tenantId: "t-1",
      name: "prohibited",
      displayName: "Prohibited Items",
      systemPromptTemplate: "Check prohibited items",
      policySourceFiles: ["prohibited.md"],
      options: { skipRedaction: true },
    });
  });
});
