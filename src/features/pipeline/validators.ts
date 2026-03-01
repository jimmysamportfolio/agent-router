import { z } from "zod";

export const agentResultSchema = z.object({
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

export const createAgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  systemPromptTemplate: z.string().min(1),
  policySourceFiles: z.array(z.string()).default([]),
});
