import { agentResultSchema } from "@/lib/validation";
import type { ILLMService } from "@/lib/llm/llm.interface";
import type {
  AgentConfig,
  AgentInput,
  SubAgentResult,
} from "@/features/pipeline/types";
import type { PolicyMatch } from "@/features/policies";
import type { IAgentFactory, PolicyAgent } from "./agent.interface";

export class AgentFactoryService implements IAgentFactory {
  private static readonly NO_POLICIES_MESSAGE = "No specific policies loaded.";

  constructor(private readonly llmService: ILLMService) {}

  /** Appends policy context to the system prompt template. */
  private static resolveSystemPrompt(
    template: string,
    policies: PolicyMatch[],
  ): string {
    const policyContext =
      policies.length === 0
        ? AgentFactoryService.NO_POLICIES_MESSAGE
        : policies.map((p) => `[${p.sourceFile}] ${p.content}`).join("\n\n");
    return `${template}\n\nRelevant Policies:\n${policyContext}`;
  }

  createPolicyAgent(config: AgentConfig, policies: PolicyMatch[]): PolicyAgent {
    const systemPrompt = AgentFactoryService.resolveSystemPrompt(
      config.systemPromptTemplate,
      policies,
    );
    const toolName = `submit_${config.name.replace(/-/g, "_")}_analysis`;

    return async (input: AgentInput): Promise<SubAgentResult> => {
      const { listing } = input;
      const userPrompt = `Listing Title: ${listing.title}
Description: ${listing.description}
Category: ${listing.category}`;

      const { data, tokensUsed } = await this.llmService.callStructured(
        systemPrompt,
        userPrompt,
        agentResultSchema,
        toolName,
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
