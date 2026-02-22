import { query, executeInTransaction } from "@/lib/db/pool";
import { ValidationError } from "@/lib/errors";
import type { PolicyChunk } from "@/lib/utils/embedding";

const PARAMS_PER_CHUNK = 5;
const MAX_PG_PARAMS = 65535;
const MAX_CHUNKS_PER_BATCH = Math.floor(MAX_PG_PARAMS / PARAMS_PER_CHUNK);

const UPSERT_CONFLICT_SQL = `ON CONFLICT (source_file, chunk_index) DO UPDATE
  SET content   = EXCLUDED.content,
      embedding = EXCLUDED.embedding,
      metadata  = EXCLUDED.metadata`;
const DELETE_ALL_POLICY_CHUNKS_SQL = `DELETE FROM policy_chunks`;
const SEARCH_POLICIES_BY_EMBEDDING_SQL = `WITH q AS (SELECT $1::vector AS v)
  SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
  FROM policy_chunks, q
  ORDER BY embedding <=> q.v
  LIMIT $2`;

interface PolicySearchRow {
  source_file: string;
  content: string;
  similarity: number;
}

function validateChunksAndEmbeddings(
  chunks: PolicyChunk[],
  embeddings: number[][],
): void {
  if (chunks.length !== embeddings.length) {
    throw new ValidationError(
      `chunks/embeddings length mismatch: ${chunks.length} chunks vs ${embeddings.length} embeddings`,
    );
  }
}

function buildPolicyChunksInsert(
  chunks: PolicyChunk[],
  embeddings: number[][],
): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const valuePlaceholders = chunks.map((chunk, index) => {
    const offset = params.length + 1;
    params.push(
      chunk.sourceFile,
      chunk.chunkIndex,
      chunk.content,
      `[${embeddings[index]!.join(",")}]`,
      JSON.stringify(chunk.metadata),
    );
    return `($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3}::vector, $${offset + 4})`;
  });

  const sql = `INSERT INTO policy_chunks (source_file, chunk_index, content, embedding, metadata)
       VALUES ${valuePlaceholders.join(", ")}`;

  return { sql, params };
}

function batchChunksAndEmbeddings(
  chunks: PolicyChunk[],
  embeddings: number[][],
): { chunks: PolicyChunk[]; embeddings: number[][] }[] {
  const batches: { chunks: PolicyChunk[]; embeddings: number[][] }[] = [];
  for (let i = 0; i < chunks.length; i += MAX_CHUNKS_PER_BATCH) {
    batches.push({
      chunks: chunks.slice(i, i + MAX_CHUNKS_PER_BATCH),
      embeddings: embeddings.slice(i, i + MAX_CHUNKS_PER_BATCH),
    });
  }
  return batches;
}

export async function upsertPolicyChunks(
  chunks: PolicyChunk[],
  embeddings: number[][],
): Promise<void> {
  validateChunksAndEmbeddings(chunks, embeddings);

  if (chunks.length === 0) return;

  await executeInTransaction(async (connection) => {
    for (const batch of batchChunksAndEmbeddings(chunks, embeddings)) {
      const { sql, params } = buildPolicyChunksInsert(
        batch.chunks,
        batch.embeddings,
      );
      await connection.query(`${sql}\n       ${UPSERT_CONFLICT_SQL}`, params);
    }
  });
}

/** Atomically deletes all existing chunks and inserts the new ones. */
export async function replaceAllPolicyChunks(
  chunks: PolicyChunk[],
  embeddings: number[][],
): Promise<void> {
  validateChunksAndEmbeddings(chunks, embeddings);

  const seen = new Set<string>();
  for (const chunk of chunks) {
    const key = `${chunk.sourceFile}\0${chunk.chunkIndex}`;
    if (seen.has(key)) {
      throw new ValidationError(
        `Duplicate (source_file, chunk_index) in input: ("${chunk.sourceFile}", ${chunk.chunkIndex})`,
      );
    }
    seen.add(key);
  }

  await executeInTransaction(async (connection) => {
    await connection.query(DELETE_ALL_POLICY_CHUNKS_SQL);

    if (chunks.length === 0) return;

    for (const batch of batchChunksAndEmbeddings(chunks, embeddings)) {
      const { sql, params } = buildPolicyChunksInsert(
        batch.chunks,
        batch.embeddings,
      );
      await connection.query(sql, params);
    }
  });
}

export async function searchPoliciesByEmbedding(
  embedding: number[],
  limit = 5,
): Promise<PolicySearchRow[]> {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new ValidationError("embedding must be a non-empty array");
  }

  const vector = `[${embedding.join(",")}]`;
  return query<PolicySearchRow>(SEARCH_POLICIES_BY_EMBEDDING_SQL, [
    vector,
    limit,
  ]);
}
