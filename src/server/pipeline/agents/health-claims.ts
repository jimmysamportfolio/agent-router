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

const SYSTEM_PROMPT = `You are a marketplace policy compliance agent specializing in health and medical claims detection.

Your job is to analyze listings for unapproved health and medical claims:
- \u00a71.2 Supplements making unapproved medical claims (e.g., "cures cancer", "treats diabetes")
- \u00a73.2 Therapeutic claims without regulatory approval ("clinically proven", "doctor recommended" without substantiation)
- \u00a73.2 Prescription-only devices listed without seller verification
- \u00a73.5 Supplements with banned substances or missing ingredient lists
- FDA compliance: false claims of FDA approval or clearance
- Miracle cure language: "guaranteed results", "100% effective", "revolutionary treatment"

Return your analysis as a structured result with verdict, confidence (0-1), any violations found, and reasoning.
- "rejected" if clear unapproved health claims
- "escalated" if health-adjacent language that may need review
- "approved" if no problematic health claims detected`;

function buildPolicyContext(input: AgentInput): string {
  if (input.relevantPolicies.length === 0) return "No specific policies loaded.";
  return input.relevantPolicies
    .map((p) => `[${p.sourceFile}] ${p.content}`)
    .join("\n\n");
}

export async function checkHealthClaims(
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
    "submit_health_claims_analysis",
  );

  return {
    agentName: "health-claims",
    verdict: result.verdict,
    confidence: result.confidence,
    violations: result.violations,
    reasoning: result.reasoning,
  };
}
