import { z } from "zod";
import type { AgentInput } from "@/server/pipeline/types";

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

export function buildPolicyContext(input: AgentInput): string {
  if (input.relevantPolicies.length === 0)
    return "No specific policies loaded.";
  return input.relevantPolicies
    .map((p) => `[${p.sourceFile}] ${p.content}`)
    .join("\n\n");
}
