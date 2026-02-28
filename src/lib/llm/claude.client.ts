import Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, type ZodType } from "zod";
import { InvariantError } from "@/lib/errors";
import { redactPersonalInformation } from "@/features/pipeline/guardrails/redactor";
import { DEFAULT_LLM_MAX_TOKENS } from "@/config/constants";
import type {
  ILLMService,
  LLMCallOptions,
  LLMTextResult,
  LLMStructuredResult,
} from "@/lib/llm/llm.interface";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 60_000;

export class LLMService implements ILLMService {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      timeout: TIMEOUT_MS,
    });
  }

  async callText(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCallOptions,
  ): Promise<LLMTextResult> {
    const redactedUserPrompt = redactPersonalInformation(userPrompt);

    const response = await this.withRetry(() =>
      this.client.messages.create({
        model: MODEL,
        max_tokens: options?.maxTokens ?? DEFAULT_LLM_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: redactedUserPrompt }],
      }),
    );

    const result: LLMTextResult = {
      text: this.extractTextContent(response),
      tokensUsed: this.calculateTokensUsed(response),
    };
    return result;
  }

  async callStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodType<T>,
    toolName: string,
    options?: LLMCallOptions,
  ): Promise<LLMStructuredResult<T>> {
    const redactedUserPrompt = redactPersonalInformation(userPrompt);
    const jsonSchema = this.zodToJsonSchema(schema);

    const response = await this.withRetry(() =>
      this.client.messages.create({
        model: MODEL,
        max_tokens: options?.maxTokens ?? DEFAULT_LLM_MAX_TOKENS,
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
      data: schema.parse(this.extractToolInput(response)),
      tokensUsed: this.calculateTokensUsed(response),
    };
    return result;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
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
          const baseDelay = BASE_DELAY_MS * Math.pow(2, attempt);
          const jitter = baseDelay * (0.5 + Math.random());
          await new Promise((resolve) => setTimeout(resolve, jitter));
        }
      }
    }
    throw lastError;
  }

  private extractTextContent(response: Anthropic.Message): string {
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      throw new InvariantError("LLM response did not contain text content");
    }
    return textBlock.text;
  }

  private extractToolInput(response: Anthropic.Message): unknown {
    const toolBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolBlock) {
      throw new InvariantError("LLM response did not contain tool_use block");
    }
    return toolBlock.input;
  }

  private calculateTokensUsed(response: Anthropic.Message): number {
    return response.usage.input_tokens + response.usage.output_tokens;
  }

  private zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
    if (typeof toJSONSchema !== "function") {
      throw new InvariantError("toJSONSchema is not available");
    }
    return toJSONSchema(schema) as Record<string, unknown>;
  }
}
