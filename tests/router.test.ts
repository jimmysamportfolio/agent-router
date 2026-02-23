import { vi, type Mock } from "vitest";
import type { ListingRow, AgentConfigRow } from "@/lib/types";

vi.mock("@/lib/utils/embedding", () => ({
  embedTexts: vi.fn(),
}));

vi.mock("@/lib/db/queries/agent-configs", () => ({
  getActiveAgentConfigsByTenant: vi.fn(),
}));

vi.mock("@/lib/db/queries/tenant-policies", () => ({
  searchTenantPoliciesByEmbedding: vi.fn(),
}));

import { embedTexts } from "@/lib/utils/embedding";
import { getActiveAgentConfigsByTenant } from "@/lib/db/queries/agent-configs";
import { searchTenantPoliciesByEmbedding } from "@/lib/db/queries/tenant-policies";
import { planAgentDispatch } from "@/server/pipeline/router";

const mockEmbed = embedTexts as Mock;
const mockGetConfigs = getActiveAgentConfigsByTenant as Mock;
const mockSearch = searchTenantPoliciesByEmbedding as Mock;

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

describe("planAgentDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);
    mockSearch.mockResolvedValue([
      { source_file: "test.md", content: "Test policy", similarity: 0.9 },
    ]);
  });

  it("returns dispatch plans for all active configs", async () => {
    const configs = [
      makeConfigRow({ id: "c1", name: "agent-a" }),
      makeConfigRow({ id: "c2", name: "agent-b" }),
    ];
    mockGetConfigs.mockResolvedValue(configs);

    const plans = await planAgentDispatch(makeListing(), "tenant-1");

    expect(plans).toHaveLength(2);
    expect(plans[0]!.agentConfig.name).toBe("agent-a");
    expect(plans[1]!.agentConfig.name).toBe("agent-b");
  });

  it("returns empty array when no active configs", async () => {
    mockGetConfigs.mockResolvedValue([]);

    const plans = await planAgentDispatch(makeListing(), "tenant-1");

    expect(plans).toHaveLength(0);
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("returns plans with empty policies when embedding fails", async () => {
    mockGetConfigs.mockResolvedValue([makeConfigRow()]);
    mockEmbed.mockResolvedValue([]);

    const plans = await planAgentDispatch(makeListing(), "tenant-1");

    expect(plans).toHaveLength(1);
    expect(plans[0]!.relevantPolicies).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("passes correct source files to vector search", async () => {
    const config = makeConfigRow({
      policy_source_files: ["prohibited.md", "health.md"],
    });
    mockGetConfigs.mockResolvedValue([config]);

    await planAgentDispatch(makeListing(), "tenant-1");

    expect(mockSearch).toHaveBeenCalledWith(
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
    mockGetConfigs.mockResolvedValue([config]);

    const plans = await planAgentDispatch(makeListing(), "t-1");

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
