import { agentResultSchema } from "@/features/pipeline/validators";
import { redactPersonalInformation } from "@/features/pipeline/guardrails/redactor";
import type { ILLMService } from "@/lib/llm/llm.interface";
import type {
  AgentConfig,
  AgentInput,
  SubAgentResult,
} from "@/features/pipeline/types";
import type { PolicyMatch } from "@/features/policies";
import type { IAgentFactory, PolicyAgent } from "./agent.interface";

const POLICY_PLACEHOLDER = "{{POLICY_CONTEXT}}";

export class AgentFactoryService implements IAgentFactory {
  private static readonly NO_POLICIES_MESSAGE = "No specific policies loaded.";

  constructor(private readonly llmService: ILLMService) {}

  private static buildPolicyContext(policies: PolicyMatch[]): string {
    if (policies.length === 0) return AgentFactoryService.NO_POLICIES_MESSAGE;
    return policies.map((p) => `[${p.sourceFile}] ${p.content}`).join("\n\n");
  }

  /** Replaces {{POLICY_CONTEXT}} if present, otherwise appends. */
  private static resolveSystemPrompt(
    template: string,
    policies: PolicyMatch[],
  ): string {
    const policyContext = AgentFactoryService.buildPolicyContext(policies);

    if (template.includes(POLICY_PLACEHOLDER)) {
      return template.replace(POLICY_PLACEHOLDER, policyContext);
    }

    return `${template}\n\nRelevant Policies:\n${policyContext}`;
  }

  createPolicyAgent(config: AgentConfig, policies: PolicyMatch[]): PolicyAgent {
    const systemPrompt = AgentFactoryService.resolveSystemPrompt(
      config.systemPromptTemplate,
      policies,
    );
    const toolName = `submit_${config.name.replace(/-/g, "_")}_analysis`;
    const skipRedaction = (config.options.skipRedaction as boolean) ?? false;

    return async (input: AgentInput): Promise<SubAgentResult> => {
      const { listing } = input;

      const rawUserPrompt = `Listing Title: ${listing.title}
Description: ${listing.description}
Category: ${listing.category}`;

      const userPrompt = skipRedaction
        ? rawUserPrompt
        : redactPersonalInformation(rawUserPrompt);

      const { data, tokensUsed } = await this.llmService.callStructured(
        systemPrompt,
        userPrompt,
        agentResultSchema,
        toolName,
        { skipRedaction },
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
