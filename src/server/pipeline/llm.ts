import Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, type ZodType } from "zod";
import { ConfigError } from "@/lib/errors";
import { CircuitBreaker } from "@/server/pipeline/guardrails/circuit-breaker";
import { redactPII } from "@/server/pipeline/guardrails/redactor";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 60_000;

const circuitBreaker = new CircuitBreaker();

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY)
    throw new ConfigError("ANTHROPIC_API_KEY");
  client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: TIMEOUT_MS,
  });
  return client;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // Don't retry client errors (except rate limits)
      if (
        err instanceof Anthropic.APIError &&
        err.status < 500 &&
        err.status !== 429
      ) {
        throw err;
      }
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number },
): Promise<string> {
  const redactedUser = redactPII(userPrompt);

  const response = await circuitBreaker.execute(() =>
    withRetry(() =>
      getClient().messages.create({
        model: MODEL,
        max_tokens: options?.maxTokens ?? 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: redactedUser }],
      }),
    ),
  );

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response format from Claude");
  }
  return block.text;
}

export async function callClaudeStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  toolName = "submit_result",
): Promise<T> {
  const redactedUser = redactPII(userPrompt);
  const jsonSchema = zodToJsonSchema(schema);

  const response = await circuitBreaker.execute(() =>
    withRetry(() =>
      getClient().messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: redactedUser }],
        tools: [
          {
            name: toolName,
            description: "Submit the structured analysis result",
            input_schema: jsonSchema as Anthropic.Tool["input_schema"],
          },
        ],
        tool_choice: { type: "tool", name: toolName },
      }),
    ),
  );

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolBlock) {
    throw new Error("Claude did not return a tool_use block");
  }

  return schema.parse(toolBlock.input);
}

/**
 * Converts a Zod schema to JSON Schema using Zod's built-in converter (v4.2.0+).
 * Falls back to { type: "object" } if toJSONSchema is unavailable or throws.
 */
function zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  try {
    if (typeof toJSONSchema !== "function") return { type: "object" };
    return toJSONSchema(schema) as Record<string, unknown>;
  } catch {
    return { type: "object" };
  }
}
