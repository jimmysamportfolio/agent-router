import type { ZodType } from "zod";

export interface LLMCallOptions {
  maxTokens?: number;
}

export interface LLMTextResult {
  text: string;
  tokensUsed: number;
}

export interface LLMStructuredResult<T> {
  data: T;
  tokensUsed: number;
}

export interface ILLMService {
  callText(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCallOptions,
  ): Promise<LLMTextResult>;

  callStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodType<T>,
    toolName: string,
    options?: LLMCallOptions,
  ): Promise<LLMStructuredResult<T>>;
}
