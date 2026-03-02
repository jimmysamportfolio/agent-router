import type { PolicyChunk } from "@/features/policies/types";

const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 512;
const OVERLAP_TOKENS = 64;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

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
