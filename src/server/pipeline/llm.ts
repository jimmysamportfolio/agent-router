import Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, type ZodType } from "zod";
import { ConfigError, InvariantError } from "@/lib/errors";
import { redactPersonalInformation } from "@/server/pipeline/guardrails/redactor";
import type {
  LLMCallOptions,
  LLMTextResult,
  LLMStructuredResult,
} from "@/server/pipeline/types";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 1024;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ConfigError("ANTHROPIC_API_KEY");
  }
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
      const isClientError =
        err instanceof Anthropic.APIError &&
        err.status < 500 &&
        err.status !== 429;
      if (isClientError) {
        throw err;
      }
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

function extractTextContent(response: Anthropic.Message): string {
  const textBlock = response.content[0];
  if (!textBlock || textBlock.type !== "text") {
    throw new InvariantError("LLM response did not contain text content");
  }
  return textBlock.text;
}

function extractToolInput(response: Anthropic.Message): unknown {
  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolBlock) {
    throw new InvariantError("LLM response did not contain tool_use block");
  }
  return toolBlock.input;
}

function calculateTokensUsed(response: Anthropic.Message): number {
  return response.usage.input_tokens + response.usage.output_tokens;
}

function zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  if (typeof toJSONSchema !== "function") {
    throw new InvariantError("toJSONSchema is not available");
  }
  return toJSONSchema(schema) as Record<string, unknown>;
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: LLMCallOptions,
): Promise<LLMTextResult> {
  const redactedUserPrompt = options?.skipRedaction
    ? userPrompt
    : redactPersonalInformation(userPrompt);

  const response = await withRetry(() =>
    getClient().messages.create({
      model: MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: redactedUserPrompt }],
    }),
  );

  const result: LLMTextResult = {
    text: extractTextContent(response),
    tokensUsed: calculateTokensUsed(response),
  };
  return result;
}

export async function callClaudeStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  toolName: string,
  options?: LLMCallOptions,
): Promise<LLMStructuredResult<T>> {
  const redactedUserPrompt = options?.skipRedaction
    ? userPrompt
    : redactPersonalInformation(userPrompt);
  const jsonSchema = zodToJsonSchema(schema);

  const response = await withRetry(() =>
    getClient().messages.create({
      model: MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: redactedUserPrompt }],
      tools: [
        {
          name: toolName,
          description: "Submit the structured analysis result",
          input_schema: jsonSchema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    }),
  );

  const result: LLMStructuredResult<T> = {
    data: schema.parse(extractToolInput(response)),
    tokensUsed: calculateTokensUsed(response),
  };
  return result;
}
