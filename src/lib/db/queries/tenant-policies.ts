import { query, executeInTransaction } from "@/lib/db/pool";
import { ValidationError } from "@/lib/errors";
import type { PolicyChunk } from "@/lib/utils/embedding";

const PARAMS_PER_CHUNK = 6;
const MAX_PG_PARAMS = 65535;
const MAX_CHUNKS_PER_BATCH = Math.floor(MAX_PG_PARAMS / PARAMS_PER_CHUNK);

const UPSERT_CONFLICT_SQL = `ON CONFLICT (tenant_id, source_file, chunk_index) DO UPDATE
  SET content   = EXCLUDED.content,
      embedding = EXCLUDED.embedding,
      metadata  = EXCLUDED.metadata`;

const DELETE_TENANT_POLICY_CHUNKS_SQL = `DELETE FROM tenant_policy_chunks WHERE tenant_id = $1 AND source_file = $2`;

export interface TenantPolicySearchRow {
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

function buildTenantPolicyChunksInsert(
  tenantId: string,
  chunks: PolicyChunk[],
  embeddings: number[][],
): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const valuePlaceholders = chunks.map((chunk, index) => {
    const offset = params.length + 1;
    params.push(
      tenantId,
      chunk.sourceFile,
      chunk.chunkIndex,
      chunk.content,
      `[${embeddings[index]!.join(",")}]`,
      JSON.stringify(chunk.metadata),
    );
    return `($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector, $${offset + 5})`;
  });

  const sql = `INSERT INTO tenant_policy_chunks (tenant_id, source_file, chunk_index, content, embedding, metadata)
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

export async function searchTenantPoliciesByEmbedding(
  tenantId: string,
  embedding: number[],
  sourceFiles: string[],
  limit = 5,
): Promise<TenantPolicySearchRow[]> {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new ValidationError("embedding must be a non-empty array");
  }

  const vector = `[${embedding.join(",")}]`;

  if (sourceFiles.length === 0) {
    const sql = `WITH q AS (SELECT $1::vector AS v)
      SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
      FROM tenant_policy_chunks, q
      WHERE tenant_id = $2
      ORDER BY embedding <=> q.v
      LIMIT $3`;
    return query<TenantPolicySearchRow>(sql, [vector, tenantId, limit]);
  }

  const sql = `WITH q AS (SELECT $1::vector AS v)
    SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
    FROM tenant_policy_chunks, q
    WHERE tenant_id = $2 AND source_file = ANY($3)
    ORDER BY embedding <=> q.v
    LIMIT $4`;
  return query<TenantPolicySearchRow>(sql, [
    vector,
    tenantId,
    sourceFiles,
    limit,
  ]);
}

export async function upsertTenantPolicyChunks(
  tenantId: string,
  chunks: PolicyChunk[],
  embeddings: number[][],
): Promise<void> {
  validateChunksAndEmbeddings(chunks, embeddings);

  if (chunks.length === 0) return;

  await executeInTransaction(async (connection) => {
    for (const batch of batchChunksAndEmbeddings(chunks, embeddings)) {
      const { sql, params } = buildTenantPolicyChunksInsert(
        tenantId,
        batch.chunks,
        batch.embeddings,
      );
      await connection.query(`${sql}\n       ${UPSERT_CONFLICT_SQL}`, params);
    }
  });
}

export async function deleteTenantPolicyChunks(
  tenantId: string,
  sourceFile: string,
): Promise<void> {
  await query(DELETE_TENANT_POLICY_CHUNKS_SQL, [tenantId, sourceFile]);
}
