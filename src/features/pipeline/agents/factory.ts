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

export class AgentFactoryService implements IAgentFactory {
  private static readonly POLICY_PLACEHOLDER = "{{POLICY_CONTEXT}}";

  private static readonly NO_POLICIES_MESSAGE = "No specific policies loaded.";

  /** Default template for policy agents. Instructions are driven by the policy content injected at {{POLICY_CONTEXT}}. */
  private static readonly DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are a marketplace policy compliance agent. Analyze the listing against the following policies and determine if it violates any rules.

{{POLICY_CONTEXT}}

Return your analysis as a structured result:
- verdict: "rejected" if clear policy violation with high confidence, "escalated" if suspicious but uncertain, "approved" if no violations detected
- confidence: 0-1 score
- violations: list any policy sections violated with severity and description
- reasoning: brief explanation of your analysis`;

  static getDefaultSystemPromptTemplate(): string {
    return AgentFactoryService.DEFAULT_SYSTEM_PROMPT_TEMPLATE;
  }

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

    if (template.includes(AgentFactoryService.POLICY_PLACEHOLDER)) {
      return template.replace(
        AgentFactoryService.POLICY_PLACEHOLDER,
        policyContext,
      );
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
