import { z } from "zod";
import { callClaudeStructured } from "@/server/pipeline/llm";
import type { AgentInput, SubAgentResult } from "@/server/pipeline/types";

const resultSchema = z.object({
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

const SYSTEM_PROMPT = `You are a marketplace policy compliance agent specializing in prohibited items detection.

Your job is to analyze listings for violations of prohibited items policies:
- \u00a71.1 Weapons and Ammunition: firearms, explosives, ammunition, replicas, accessories (silencers, bump stocks)
- \u00a71.2 Controlled Substances: drugs, drug paraphernalia, prescription medications, precursor chemicals
- \u00a71.3 Hazardous Materials: asbestos, lead paint, banned pesticides, recalled products, unlabeled chemicals
- \u00a71.4 Stolen Goods: items suspected stolen, removed serial numbers, no provenance
- \u00a71.5 Human Remains and Protected Wildlife: organs, CITES-banned products, ivory, exotic leathers

Return your analysis as a structured result with verdict, confidence (0-1), any violations found, and reasoning.
- "rejected" if clear policy violation with high confidence
- "escalated" if suspicious but uncertain
- "approved" if no prohibited items detected`;

function buildPolicyContext(input: AgentInput): string {
  if (input.relevantPolicies.length === 0) return "No specific policies loaded.";
  return input.relevantPolicies
    .map((p) => `[${p.sourceFile}] ${p.content}`)
    .join("\n\n");
}

export async function checkProhibited(
  input: AgentInput,
): Promise<SubAgentResult> {
  const userPrompt = `Listing Title: ${input.listing.title}
Description: ${input.listing.description}
Category: ${input.listing.category}

Relevant Policies:
${buildPolicyContext(input)}`;

  const result = await callClaudeStructured(
    SYSTEM_PROMPT,
    userPrompt,
    resultSchema,
    "submit_prohibited_analysis",
  );

  return {
    agentName: "prohibited",
    verdict: result.verdict,
    confidence: result.confidence,
    violations: result.violations,
    reasoning: result.reasoning,
  };
}
