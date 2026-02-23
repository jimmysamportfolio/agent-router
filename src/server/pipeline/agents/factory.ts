import { callClaudeStructured } from "@/server/pipeline/llm";
import { resultSchema } from "@/server/pipeline/agents/shared";
import type {
  AgentConfig,
  AgentInput,
  PolicyMatch,
  SubAgentResult,
} from "@/server/pipeline/types";

const POLICY_PLACEHOLDER = "{{POLICY_CONTEXT}}";

function formatPolicies(policies: PolicyMatch[]): string {
  if (policies.length === 0) return "No specific policies loaded.";
  return policies.map((p) => `[${p.sourceFile}] ${p.content}`).join("\n\n");
}

function resolveSystemPrompt(
  template: string,
  policies: PolicyMatch[],
): string {
  const policyContext = formatPolicies(policies);
  if (template.includes(POLICY_PLACEHOLDER)) {
    return template.replace(POLICY_PLACEHOLDER, policyContext);
  }
  return `${template}\n\nRelevant Policies:\n${policyContext}`;
}

function buildUserPrompt(input: AgentInput): string {
  return `Listing Title: ${input.listing.title}\nDescription: ${input.listing.description}\nCategory: ${input.listing.category}`;
}

export function createPolicyAgent(
  config: AgentConfig,
  policies: PolicyMatch[],
): (input: AgentInput) => Promise<SubAgentResult> {
  const systemPrompt = resolveSystemPrompt(
    config.systemPromptTemplate,
    policies,
  );
  const toolName = `submit_${config.name.replace(/-/g, "_")}_analysis`;

  return async (input: AgentInput): Promise<SubAgentResult> => {
    const userPrompt = buildUserPrompt(input);

    const result = await callClaudeStructured(
      systemPrompt,
      userPrompt,
      resultSchema,
      toolName,
      { skipRedaction: config.options.skipRedaction ?? false },
    );

    return {
      agentName: config.name,
      verdict: result.verdict,
      confidence: result.confidence,
      violations: result.violations,
      reasoning: result.reasoning,
    };
  };
}
