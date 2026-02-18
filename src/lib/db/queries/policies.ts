import { query, executeInTransaction } from "@/lib/db/pool";
import type { PolicyChunk } from "@/lib/utils/embedding";

export async function upsertPolicyChunks(
  chunks: PolicyChunk[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `chunks/embeddings length mismatch: ${chunks.length} chunks vs ${embeddings.length} embeddings`
    );
  }

  if (chunks.length === 0) return;

  await executeInTransaction(async (connection) => {
    const params: unknown[] = [];
    const valuePlaceholders = chunks.map((chunk, index) => {
      const offset = params.length + 1;
      params.push(
        chunk.sourceFile,
        chunk.chunkIndex,
        chunk.content,
        `[${embeddings[index]!.join(",")}]`,
        JSON.stringify(chunk.metadata)
      );
      return `($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3}::vector, $${offset + 4})`;
    });

    await connection.query(
      `INSERT INTO policy_chunks (source_file, chunk_index, content, embedding, metadata)
       VALUES ${valuePlaceholders.join(", ")}
       ON CONFLICT (source_file, chunk_index) DO UPDATE
         SET content   = EXCLUDED.content,
             embedding = EXCLUDED.embedding,
             metadata  = EXCLUDED.metadata`,
      params
    );
  });
}

/** Atomically deletes all existing chunks and inserts the new ones. */
export async function replaceAllPolicyChunks(
  chunks: PolicyChunk[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `chunks/embeddings length mismatch: ${chunks.length} chunks vs ${embeddings.length} embeddings`
    );
  }

  await executeInTransaction(async (connection) => {
    await connection.query("DELETE FROM policy_chunks");

    if (chunks.length === 0) return;

    const params: unknown[] = [];
    const valuePlaceholders = chunks.map((chunk, index) => {
      const offset = params.length + 1;
      params.push(
        chunk.sourceFile,
        chunk.chunkIndex,
        chunk.content,
        `[${embeddings[index]!.join(",")}]`,
        JSON.stringify(chunk.metadata)
      );
      return `($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3}::vector, $${offset + 4})`;
    });

    await connection.query(
      `INSERT INTO policy_chunks (source_file, chunk_index, content, embedding, metadata)
       VALUES ${valuePlaceholders.join(", ")}
       ON CONFLICT (source_file, chunk_index) DO UPDATE
         SET content   = EXCLUDED.content,
             embedding = EXCLUDED.embedding,
             metadata  = EXCLUDED.metadata`,
      params
    );
  });
}

export async function searchPoliciesByEmbedding(
  embedding: number[],
  limit = 5
): Promise<{ source_file: string; content: string; similarity: number }[]> {
  const vector = `[${embedding.join(",")}]`;
  return query(
    `WITH q AS (SELECT $1::vector AS v)
     SELECT source_file, content,
            1 - (embedding <=> q.v) AS similarity
     FROM policy_chunks, q
     ORDER BY embedding <=> q.v
     LIMIT $2`,
    [vector, limit]
  );
}
