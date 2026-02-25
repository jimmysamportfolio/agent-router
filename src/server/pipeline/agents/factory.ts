import { agentResultSchema } from "@/lib/validation";
import { callClaudeStructured } from "@/server/pipeline/llm";
import type {
  AgentConfig,
  AgentInput,
  PolicyMatch,
  SubAgentResult,
} from "@/server/pipeline/types";

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

export type PolicyAgent = (input: AgentInput) => Promise<SubAgentResult>;

export function createPolicyAgent(
  config: AgentConfig,
  policies: PolicyMatch[],
): PolicyAgent {
  const systemPrompt = resolveSystemPrompt(
    config.systemPromptTemplate,
    policies,
  );
  const toolName = buildToolName(config.name);

  return async (input: AgentInput): Promise<SubAgentResult> => {
    const userPrompt = buildAgentUserPrompt(input);

    const { data, tokensUsed } = await callClaudeStructured(
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
