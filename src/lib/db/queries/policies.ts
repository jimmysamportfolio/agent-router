import { pool, query } from "@/lib/db/pool";
import type { PolicyChunk } from "@/lib/utils/embedding";

export async function clearPolicyChunks(): Promise<void> {
  await query("DELETE FROM policy_chunks");
}

export async function upsertPolicyChunks(
  chunks: PolicyChunk[],
  embeddings: number[][]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const vector = `[${embeddings[i]!.join(",")}]`;

      await client.query(
        `INSERT INTO policy_chunks (source_file, chunk_index, content, embedding, metadata)
         VALUES ($1, $2, $3, $4::vector, $5)
         ON CONFLICT (source_file, chunk_index) DO UPDATE
           SET content   = EXCLUDED.content,
               embedding = EXCLUDED.embedding,
               metadata  = EXCLUDED.metadata`,
        [
          chunk.sourceFile,
          chunk.chunkIndex,
          chunk.content,
          vector,
          JSON.stringify(chunk.metadata),
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function searchPoliciesByEmbedding(
  embedding: number[],
  limit = 5
): Promise<{ source_file: string; content: string; similarity: number }[]> {
  const vector = `[${embedding.join(",")}]`;
  return query(
    `SELECT source_file, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM policy_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vector, limit]
  );
}
