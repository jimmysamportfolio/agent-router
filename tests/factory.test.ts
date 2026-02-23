import { vi, type Mock } from "vitest";
import type {
  AgentConfig,
  AgentInput,
  PolicyMatch,
  SubAgentResult,
} from "@/server/pipeline/types";
import type { ListingRow } from "@/lib/types";

vi.mock("@/server/pipeline/llm", () => ({
  callClaudeStructured: vi.fn(),
}));

import { callClaudeStructured } from "@/server/pipeline/llm";
import { createPolicyAgent } from "@/server/pipeline/agents/factory";

const mockCallClaude = callClaudeStructured as Mock;

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: "config-1",
    tenantId: "tenant-1",
    name: "test-agent",
    displayName: "Test Agent",
    systemPromptTemplate: "You are a test agent.\n\n{{POLICY_CONTEXT}}",
    policySourceFiles: ["test.md"],
    options: {},
    ...overrides,
  };
}

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

function makeInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    reviewId: "review-1",
    listing: makeListing(),
    relevantPolicies: [],
    ...overrides,
  };
}

function makePolicies(): PolicyMatch[] {
  return [
    { sourceFile: "test.md", content: "No weapons allowed.", similarity: 0.95 },
    { sourceFile: "test.md", content: "No drugs allowed.", similarity: 0.9 },
  ];
}

const MOCK_LLM_RESULT = {
  verdict: "approved" as const,
  confidence: 0.95,
  violations: [],
  reasoning: "No issues found",
};

describe("createPolicyAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallClaude.mockResolvedValue(MOCK_LLM_RESULT);
  });

  it("resolves {{POLICY_CONTEXT}} placeholder in system prompt", async () => {
    const policies = makePolicies();
    const agent = createPolicyAgent(makeConfig(), policies);
    await agent(makeInput());

    const systemPrompt = mockCallClaude.mock.calls[0]![0] as string;
    expect(systemPrompt).toContain("[test.md] No weapons allowed.");
    expect(systemPrompt).toContain("[test.md] No drugs allowed.");
    expect(systemPrompt).not.toContain("{{POLICY_CONTEXT}}");
  });

  it("appends policies when no placeholder found", async () => {
    const config = makeConfig({
      systemPromptTemplate: "You are a test agent with no placeholder.",
    });
    const policies = makePolicies();
    const agent = createPolicyAgent(config, policies);
    await agent(makeInput());

    const systemPrompt = mockCallClaude.mock.calls[0]![0] as string;
    expect(systemPrompt).toContain("Relevant Policies:");
    expect(systemPrompt).toContain("[test.md] No weapons allowed.");
  });

  it("handles empty policies", async () => {
    const agent = createPolicyAgent(makeConfig(), []);
    await agent(makeInput());

    const systemPrompt = mockCallClaude.mock.calls[0]![0] as string;
    expect(systemPrompt).toContain("No specific policies loaded.");
  });

  it("returns correct SubAgentResult shape", async () => {
    const agent = createPolicyAgent(makeConfig(), []);
    const result = await agent(makeInput());

    expect(result).toEqual({
      agentName: "test-agent",
      verdict: "approved",
      confidence: 0.95,
      violations: [],
      reasoning: "No issues found",
    } satisfies SubAgentResult);
  });

  it("derives tool name from config name with hyphens", async () => {
    const config = makeConfig({ name: "health-claims" });
    const agent = createPolicyAgent(config, []);
    await agent(makeInput());

    const toolName = mockCallClaude.mock.calls[0]![3] as string;
    expect(toolName).toBe("submit_health_claims_analysis");
  });

  it("passes skipRedaction option through", async () => {
    const config = makeConfig({ options: { skipRedaction: true } });
    const agent = createPolicyAgent(config, []);
    await agent(makeInput());

    const options = mockCallClaude.mock.calls[0]![4] as {
      skipRedaction: boolean;
    };
    expect(options.skipRedaction).toBe(true);
  });

  it("defaults skipRedaction to false", async () => {
    const agent = createPolicyAgent(makeConfig(), []);
    await agent(makeInput());

    const options = mockCallClaude.mock.calls[0]![4] as {
      skipRedaction: boolean;
    };
    expect(options.skipRedaction).toBe(false);
  });

  it("builds user prompt from listing fields", async () => {
    const listing = makeListing({
      title: "Rare Sword",
      description: "Ancient blade",
      category: "Collectibles",
    });
    const agent = createPolicyAgent(makeConfig(), []);
    await agent(makeInput({ listing }));

    const userPrompt = mockCallClaude.mock.calls[0]![1] as string;
    expect(userPrompt).toContain("Listing Title: Rare Sword");
    expect(userPrompt).toContain("Description: Ancient blade");
    expect(userPrompt).toContain("Category: Collectibles");
  });
});
