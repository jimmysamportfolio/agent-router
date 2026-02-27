import { agentResultSchema } from "@/lib/validation";
import type { ILLMService } from "@/lib/llm/llm.interface";
import type {
  AgentConfig,
  AgentInput,
  SubAgentResult,
} from "@/features/pipeline/types";
import type { PolicyMatch } from "@/features/policies/types";
import type { IAgentFactory, PolicyAgent } from "./agent.interface";

const POLICY_PLACEHOLDER = "{{POLICY_CONTEXT}}";
const NO_POLICIES_MESSAGE = "No specific policies loaded.";

function formatPolicyContext(policies: PolicyMatch[]): string {
  if (policies.length === 0) return NO_POLICIES_MESSAGE;
  return policies.map((p) => `[${p.sourceFile}] ${p.content}`).join("\n\n");
}

function resolveSystemPrompt(
  template: string,
  policies: PolicyMatch[],
): string {
  const policyContext = formatPolicyContext(policies);
  if (template.includes(POLICY_PLACEHOLDER)) {
    return template.replace(POLICY_PLACEHOLDER, policyContext);
  }
  return `${template}\n\nRelevant Policies:\n${policyContext}`;
}

function buildAgentUserPrompt(input: AgentInput): string {
  const { listing } = input;
  const userPrompt = `Listing Title: ${listing.title}
Description: ${listing.description}
Category: ${listing.category}`;
  return userPrompt;
}

function buildToolName(agentName: string): string {
  const sanitizedName = agentName.replace(/-/g, "_");
  return `submit_${sanitizedName}_analysis`;
}

export class AgentFactoryService implements IAgentFactory {
  constructor(private readonly llmService: ILLMService) {}

  createPolicyAgent(config: AgentConfig, policies: PolicyMatch[]): PolicyAgent {
    const systemPrompt = resolveSystemPrompt(
      config.systemPromptTemplate,
      policies,
    );
    const toolName = buildToolName(config.name);

    return async (input: AgentInput): Promise<SubAgentResult> => {
      const userPrompt = buildAgentUserPrompt(input);

      const { data, tokensUsed } = await this.llmService.callStructured(
        systemPrompt,
        userPrompt,
        agentResultSchema,
        toolName,
        { skipRedaction: config.options.skipRedaction ?? false },
      );

      input.tokenTracker?.add(tokensUsed);

      const result: SubAgentResult = {
        agentName: config.name,
        verdict: data.verdict,
        confidence: data.confidence,
        violations: data.violations,
        reasoning: data.reasoning,
      };
      return result;
    };
  }
}
