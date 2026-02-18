import { query, executeInTransaction } from "@/lib/db/pool";
import type { PolicyChunk } from "@/lib/utils/embedding";

export async function upsertPolicyChunks(
  chunks: PolicyChunk[],
  embeddings: number[][]
): Promise<void> {
  validateChunksAndEmbeddings(chunks, embeddings);

  if (chunks.length === 0) return;

  await executeInTransaction(async (connection) => {
    const { sql, params } = buildPolicyChunksInsert(chunks, embeddings);
    await connection.query(
      `${sql}
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
  validateChunksAndEmbeddings(chunks, embeddings);

  const seen = new Set<string>();
  for (const chunk of chunks) {
    const key = `${chunk.sourceFile}\0${chunk.chunkIndex}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate (source_file, chunk_index) in input: ("${chunk.sourceFile}", ${chunk.chunkIndex})`
      );
    }
    seen.add(key);
  }

  await executeInTransaction(async (connection) => {
    await connection.query("DELETE FROM policy_chunks");

    if (chunks.length === 0) return;

    const { sql, params } = buildPolicyChunksInsert(chunks, embeddings);
    await connection.query(sql, params);
  });
}

export async function searchPoliciesByEmbedding(
  embedding: number[],
  limit = 5
): Promise<{ source_file: string; content: string; similarity: number }[]> {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("embedding must be a non-empty array");
  }

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


// helpers

function validateChunksAndEmbeddings(
  chunks: PolicyChunk[],
  embeddings: number[][]
): void {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `chunks/embeddings length mismatch: ${chunks.length} chunks vs ${embeddings.length} embeddings`
    );
  }
}

function buildPolicyChunksInsert(
  chunks: PolicyChunk[],
  embeddings: number[][]
): { sql: string; params: unknown[] } {
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

  const sql = `INSERT INTO policy_chunks (source_file, chunk_index, content, embedding, metadata)
       VALUES ${valuePlaceholders.join(", ")}`;

  return { sql, params };
}