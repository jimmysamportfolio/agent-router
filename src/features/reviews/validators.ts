import { z } from "zod";

export const submitListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1),
  tenantId: z.string().uuid(),
  imageUrls: z.array(z.string().url()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const reviewIdSchema = z.string().uuid();
