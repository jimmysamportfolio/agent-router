import { z } from "zod";

export const reviewStatusSchema = z.enum([
  "pending",
  "routing",
  "scanning",
  "aggregating",
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
});

export const reviewIdSchema = z.string().uuid();
