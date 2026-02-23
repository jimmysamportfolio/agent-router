import { z } from "zod";

export const reviewStatusSchema = z.enum([
  "pending",
  "routing",
  "complete",
  "escalated",
  "failed",
]);

export const verdictSchema = z.enum(["approved", "rejected", "escalated"]);

export const severitySchema = z.enum(["low", "medium", "high", "critical"]);

export const submitListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1),
  imageUrls: z.array(z.string().url()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tenantId: z.string().uuid().optional(),
});

export const reviewIdSchema = z.string().uuid();

export const tenantIdSchema = z.string().uuid();

export const createAgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  systemPromptTemplate: z.string().min(1),
  policySourceFiles: z.array(z.string()).default([]),
  options: z.record(z.string(), z.unknown()).default({}),
});
