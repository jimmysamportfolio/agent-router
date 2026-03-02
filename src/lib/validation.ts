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

export const tenantIdSchema = z.string().uuid();
