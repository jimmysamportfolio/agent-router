import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
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
  if (!process.env.ANTHROPIC_API_KEY) throw new ConfigError("ANTHROPIC_API_KEY");
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS });
  return client;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
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
 * Minimal Zod-to-JSON-Schema converter for the shapes we use.
 * Handles objects, arrays, strings, numbers, enums, and optionals.
 * Written for Zod v4 where internals use `_zod.def` instead of `_def`.
 */
function zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const def = (schema as unknown as { _zod?: { def: Record<string, unknown> } })._zod?.def as
    | Record<string, unknown>
    | undefined;
  if (!def) {
    // Fallback: return permissive schema
    return { type: "object" };
  }

  const typeName =
    (def.typeName as string | undefined) ?? (def.type as string | undefined);

  switch (typeName) {
    case "string":
      return { type: "string" };
    case "number":
    case "float":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "array": {
      const innerType = def.innerType as ZodType<unknown> | undefined;
      return {
        type: "array",
        items: innerType ? zodToJsonSchema(innerType) : {},
      };
    }
    case "object": {
      const shape = def.shape as Record<string, ZodType<unknown>> | undefined;
      if (!shape) return { type: "object" };
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        const valDef = (
          value as unknown as { _zod?: { def: Record<string, unknown> } }
        )._zod?.def as Record<string, unknown> | undefined;
        const valTypeName =
          (valDef?.typeName as string | undefined) ??
          (valDef?.type as string | undefined);
        if (valTypeName === "optional" || valTypeName === "default") {
          const inner = valDef?.innerType as ZodType<unknown> | undefined;
          properties[key] = inner ? zodToJsonSchema(inner) : {};
        } else {
          properties[key] = zodToJsonSchema(value);
          required.push(key);
        }
      }
      return { type: "object", properties, required };
    }
    case "enum": {
      const values = def.values as string[] | undefined;
      return values ? { type: "string", enum: values } : { type: "string" };
    }
    case "literal": {
      const value = def.value;
      return { type: typeof value, enum: [value] };
    }
    case "union": {
      const options = def.options as ZodType<unknown>[] | undefined;
      if (!options) return {};
      // Check if all options are literals (enum-like union)
      const allLiterals = options.every((opt) => {
        const optDef = (opt as unknown as { _zod?: { def: Record<string, unknown> } })._zod
          ?.def as Record<string, unknown> | undefined;
        const optType =
          (optDef?.typeName as string | undefined) ??
          (optDef?.type as string | undefined);
        return optType === "literal";
      });
      if (allLiterals) {
        const values = options.map((opt) => {
          const optDef = (opt as unknown as { _zod?: { def: Record<string, unknown> } })._zod
            ?.def as Record<string, unknown> | undefined;
          return optDef?.value;
        });
        return { type: "string", enum: values };
      }
      return { anyOf: options.map(zodToJsonSchema) };
    }
    case "optional": {
      const inner = def.innerType as ZodType<unknown> | undefined;
      return inner ? zodToJsonSchema(inner) : {};
    }
    default:
      return { type: "object" };
  }
}
