import { GoogleGenAI } from "@google/genai";
import { getGeminiEnv } from "@/config/env";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 512;
const OVERLAP_TOKENS = 64;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;
const BATCH_LIMIT = 100;

let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const { GEMINI_API_KEY } = getGeminiEnv();
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return ai;
}

export interface PolicyChunk {
  sourceFile: string;
  chunkIndex: number;
  content: string;
  metadata: { sections: string[] };
}

function extractSections(text: string): string[] {
  const matches = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)];
  return matches.map((m) => m[1]!.trim());
}

export function chunkPolicy(sourceFile: string, text: string): PolicyChunk[] {
  const chunks: PolicyChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + TARGET_CHARS, text.length);
    let slice = text.slice(start, end);

    // Break on paragraph boundary to avoid mid-sentence splits
    if (end < text.length) {
      const lastBreak = slice.lastIndexOf("\n\n");
      if (lastBreak > TARGET_CHARS * 0.5) {
        slice = slice.slice(0, lastBreak);
      }
    }

    chunks.push({
      sourceFile,
      chunkIndex,
      content: slice.trim(),
      metadata: { sections: extractSections(slice) },
    });

    // add at least 1 since slice.length - OVERLAP_CHARS might be 0 to avoid infinite loop
    start += Math.max(1, slice.length - OVERLAP_CHARS);
    chunkIndex++;
  }

  return chunks;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const results: number[][] = [];
  const client = getGeminiClient();

  for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
    const batch = texts.slice(i, i + BATCH_LIMIT);
    const embeddings = await Promise.all(
      batch.map(async (text) => {
        const res = await client.models.embedContent({
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
