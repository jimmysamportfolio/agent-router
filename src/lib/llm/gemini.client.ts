import { GoogleGenAI } from "@google/genai";
import { toJSONSchema, type ZodType } from "zod";
import { InvariantError } from "@/lib/errors";
import { redactPersonalInformation } from "@/features/pipeline/guardrails/redactor";
import type {
  ILLMService,
  LLMCallOptions,
  LLMTextResult,
  LLMStructuredResult,
} from "@/lib/llm/llm.interface";

const MODEL = "gemini-2.0-flash";
const DEFAULT_LLM_MAX_TOKENS = 1024;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class GeminiLLMService implements ILLMService {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async callText(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCallOptions,
  ): Promise<LLMTextResult> {
    const redactedUserPrompt = redactPersonalInformation(userPrompt);

    const response = await this.withRetry(() =>
      this.client.models.generateContent({
        model: MODEL,
        contents: redactedUserPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options?.maxTokens ?? DEFAULT_LLM_MAX_TOKENS,
        },
      }),
    );

    const text = response.text;
    if (text === undefined || text === "") {
      throw new InvariantError("LLM response did not contain text content");
    }

    const result: LLMTextResult = {
      text,
      tokensUsed: this.calculateTokensUsed(response),
    };
    return result;
  }

  async callStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodType<T>,
    _toolName: string,
    options?: LLMCallOptions,
  ): Promise<LLMStructuredResult<T>> {
    const redactedUserPrompt = redactPersonalInformation(userPrompt);
    const jsonSchema = this.zodToJsonSchema(schema);

    const response = await this.withRetry(() =>
      this.client.models.generateContent({
        model: MODEL,
        contents: redactedUserPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options?.maxTokens ?? DEFAULT_LLM_MAX_TOKENS,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      }),
    );

    const text = response.text;
    if (text === undefined || text === "") {
      throw new InvariantError("LLM response did not contain text content");
    }

    const parsed = JSON.parse(text) as unknown;
    const result: LLMStructuredResult<T> = {
      data: schema.parse(parsed),
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
          err != null &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: number }).status === "number" &&
          (err as { status: number }).status < 500 &&
          (err as { status: number }).status !== 429;
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

  private calculateTokensUsed(response: {
    usageMetadata?: { totalTokenCount?: number };
  }): number {
    const total = response.usageMetadata?.totalTokenCount;
    return typeof total === "number" ? total : 0;
  }

  private zodToJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
    if (typeof toJSONSchema !== "function") {
      throw new InvariantError("toJSONSchema is not available");
    }
    return toJSONSchema(schema) as Record<string, unknown>;
  }
}
