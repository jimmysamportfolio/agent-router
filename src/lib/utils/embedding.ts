import { GoogleGenAI } from "@google/genai";
import { getGeminiEnv } from "@/config/env";

export interface IEmbeddingService {
  embedTexts(texts: string[]): Promise<number[][]>;
}

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_LIMIT = 100;

export class GeminiEmbeddingService implements IEmbeddingService {
  private client: GoogleGenAI;

  constructor() {
    const { GEMINI_API_KEY } = getGeminiEnv();
    this.client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
      const batch = texts.slice(i, i + BATCH_LIMIT);
      const embeddings = await Promise.all(
        batch.map(async (text) => {
          const res = await this.client.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text,
            config: { outputDimensionality: EMBEDDING_DIMENSIONS },
          });
          const values = res.embeddings?.[0]?.values;
          if (!values || values.length === 0) {
            throw new Error(
              `Embedding API returned no values (model=${EMBEDDING_MODEL}, textLength=${text.length})`,
            );
          }
          return values;
        }),
      );
      results.push(...embeddings);
    }

    return results;
  }
}

/**
 * Standalone function for seed scripts that don't use DI.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const service = new GeminiEmbeddingService();
  return service.embedTexts(texts);
}
