import { z } from "zod";
import { callClaudeStructured } from "@/server/pipeline/llm";
import type {
  AgentConfig,
  AgentInput,
  PolicyMatch,
  SubAgentResult,
} from "@/server/pipeline/types";

const POLICY_PLACEHOLDER = "{{POLICY_CONTEXT}}";

export const resultSchema = z.object({
  verdict: z.enum(["approved", "rejected", "escalated"]),
  confidence: z.number().min(0).max(1),
  violations: z.array(
    z.object({
      policySection: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
    }),
  ),
  reasoning: z.string(),
});

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

    const agentResult: SubAgentResult = {
      agentName: config.name,
      verdict: result.verdict,
      confidence: result.confidence,
      violations: result.violations,
      reasoning: result.reasoning,
    };
    return agentResult;
  };
}
