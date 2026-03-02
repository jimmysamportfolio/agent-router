import { vi } from "vitest";
import type { ILLMService, LLMStructuredResult } from "@/lib/llm/llm.interface";
import { AgentFactoryService } from "@/features/pipeline/agents/factory";
import type {
  AgentConfig,
  AgentInput,
  SubAgentResult,
} from "@/features/pipeline/types";
import type { PolicyMatch } from "@/features/policies";
import type { ListingRow } from "@/features/listings";

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
    listing: makeListing(),
    ...overrides,
  };
}

function makePolicies(): PolicyMatch[] {
  return [
    { sourceFile: "test.md", content: "No weapons allowed.", similarity: 0.95 },
    { sourceFile: "test.md", content: "No drugs allowed.", similarity: 0.9 },
  ];
}

const MOCK_LLM_DATA = {
  verdict: "approved" as const,
  confidence: 0.95,
  violations: [],
  reasoning: "No issues found",
};

const MOCK_LLM_RESULT: LLMStructuredResult<typeof MOCK_LLM_DATA> = {
  data: MOCK_LLM_DATA,
  tokensUsed: 150,
};

function createMockLLM(): ILLMService & {
  callStructured: ReturnType<typeof vi.fn>;
} {
  return {
    callText: vi.fn(),
    callStructured: vi.fn().mockResolvedValue(MOCK_LLM_RESULT),
  };
}

describe("AgentFactoryService", () => {
  let mockLLM: ReturnType<typeof createMockLLM>;
  let factory: AgentFactoryService;

  beforeEach(() => {
    mockLLM = createMockLLM();
    factory = new AgentFactoryService(mockLLM);
  });

  it("resolves {{POLICY_CONTEXT}} placeholder in system prompt", async () => {
    const policies = makePolicies();
    const agent = factory.createPolicyAgent(makeConfig(), policies);
    await agent(makeInput());

    const systemPrompt = mockLLM.callStructured.mock.calls[0]![0] as string;
    expect(systemPrompt).toContain("[test.md] No weapons allowed.");
    expect(systemPrompt).toContain("[test.md] No drugs allowed.");
    expect(systemPrompt).not.toContain("{{POLICY_CONTEXT}}");
  });

  it("appends policies when no placeholder found", async () => {
    const config = makeConfig({
      systemPromptTemplate: "You are a test agent with no placeholder.",
    });
    const policies = makePolicies();
    const agent = factory.createPolicyAgent(config, policies);
    await agent(makeInput());

    const systemPrompt = mockLLM.callStructured.mock.calls[0]![0] as string;
    expect(systemPrompt).toContain("Relevant Policies:");
    expect(systemPrompt).toContain("[test.md] No weapons allowed.");
  });

  it("handles empty policies", async () => {
    const agent = factory.createPolicyAgent(makeConfig(), []);
    await agent(makeInput());

    const systemPrompt = mockLLM.callStructured.mock.calls[0]![0] as string;
    expect(systemPrompt).toContain("No specific policies loaded.");
  });

  it("returns correct SubAgentResult shape", async () => {
    const agent = factory.createPolicyAgent(makeConfig(), []);
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
    const agent = factory.createPolicyAgent(config, []);
    await agent(makeInput());

    const toolName = mockLLM.callStructured.mock.calls[0]![3] as string;
    expect(toolName).toBe("submit_health_claims_analysis");
  });

  it("passes skipRedaction option through", async () => {
    const config = makeConfig({ options: { skipRedaction: true } });
    const agent = factory.createPolicyAgent(config, []);
    await agent(makeInput());

    const options = mockLLM.callStructured.mock.calls[0]![4] as {
      skipRedaction: boolean;
    };
    expect(options.skipRedaction).toBe(true);
  });

  it("defaults skipRedaction to false", async () => {
    const agent = factory.createPolicyAgent(makeConfig(), []);
    await agent(makeInput());

    const options = mockLLM.callStructured.mock.calls[0]![4] as {
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
    const agent = factory.createPolicyAgent(makeConfig(), []);
    await agent(makeInput({ listing }));

    const userPrompt = mockLLM.callStructured.mock.calls[0]![1] as string;
    expect(userPrompt).toContain("Listing Title: Rare Sword");
    expect(userPrompt).toContain("Description: Ancient blade");
    expect(userPrompt).toContain("Category: Collectibles");
  });
});
