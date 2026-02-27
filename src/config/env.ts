import { z } from "zod";

const dbEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DB_CONN_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(5000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30000),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
});

const redisEnvSchema = z.object({
  REDIS_URL: z.string().min(1),
});

const llmEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
});

const geminiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
});

const appEnvSchema = z.object({
  QUEUE_PROVIDER: z.enum(["bullmq", "sqs"]).default("bullmq"),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

export type DbEnv = z.infer<typeof dbEnvSchema>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
export type LlmEnv = z.infer<typeof llmEnvSchema>;
export type GeminiEnv = z.infer<typeof geminiEnvSchema>;
export type AppEnv = z.infer<typeof appEnvSchema>;

function cached<T>(schema: z.ZodType<T>): () => T {
  let value: T | undefined;
  return () => {
    if (value !== undefined) return value;
    value = schema.parse(process.env);
    return value;
  };
}

export const getDbEnv = cached(dbEnvSchema);
export const getRedisEnv = cached(redisEnvSchema);
export const getLlmEnv = cached(llmEnvSchema);
export const getGeminiEnv = cached(geminiEnvSchema);
export const getAppEnv = cached(appEnvSchema);
