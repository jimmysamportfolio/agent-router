import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  QUEUE_PROVIDER: z.enum(["bullmq", "sqs"]).default("bullmq"),
  DB_POOL_MAX: z.string().default("10"),
  DB_CONN_TIMEOUT_MS: z.string().default("5000"),
  DB_IDLE_TIMEOUT_MS: z.string().default("30000"),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
