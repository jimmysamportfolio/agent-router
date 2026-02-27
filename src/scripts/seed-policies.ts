import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool } from "@/lib/db/pool";
import { chunkPolicy, embedTexts } from "@/lib/utils/embedding";
import { executeInTransaction } from "@/lib/db/client";
import { ValidationError } from "@/lib/errors";
import type { PolicyChunk } from "@/lib/utils/embedding";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const PARAMS_PER_GLOBAL_CHUNK = 5;
const PARAMS_PER_TENANT_CHUNK = 6;
const MAX_PG_PARAMS = 65535;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function batchChunksAndEmbeddings(
  chunks: PolicyChunk[],
  embeddings: number[][],
  maxPerBatch: number,
): { chunks: PolicyChunk[]; embeddings: number[][] }[] {
  const batches: { chunks: PolicyChunk[]; embeddings: number[][] }[] = [];
  for (let i = 0; i < chunks.length; i += maxPerBatch) {
    batches.push({
      chunks: chunks.slice(i, i + maxPerBatch),
      embeddings: embeddings.slice(i, i + maxPerBatch),
    });
  }
  return batches;
}

function buildGlobalChunksInsert(
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

function buildTenantChunksInsert(
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

async function replaceAllPolicyChunks(
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

  const maxPerBatch = Math.floor(MAX_PG_PARAMS / PARAMS_PER_GLOBAL_CHUNK);

  await executeInTransaction(async (connection) => {
    await connection.query(`DELETE FROM policy_chunks`);
    if (chunks.length === 0) return;
    for (const batch of batchChunksAndEmbeddings(
      chunks,
      embeddings,
      maxPerBatch,
    )) {
      const { sql, params } = buildGlobalChunksInsert(
        batch.chunks,
        batch.embeddings,
      );
      await connection.query(sql, params);
    }
  });
}

async function upsertTenantPolicyChunks(
  tenantId: string,
  chunks: PolicyChunk[],
  embeddings: number[][],
): Promise<void> {
  validateChunksAndEmbeddings(chunks, embeddings);
  if (chunks.length === 0) return;

  const upsertConflict = `ON CONFLICT (tenant_id, source_file, chunk_index) DO UPDATE
    SET content   = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata  = EXCLUDED.metadata`;
  const maxPerBatch = Math.floor(MAX_PG_PARAMS / PARAMS_PER_TENANT_CHUNK);

  await executeInTransaction(async (connection) => {
    for (const batch of batchChunksAndEmbeddings(
      chunks,
      embeddings,
      maxPerBatch,
    )) {
      const { sql, params } = buildTenantChunksInsert(
        tenantId,
        batch.chunks,
        batch.embeddings,
      );
      await connection.query(`${sql}\n       ${upsertConflict}`, params);
    }
  });
}

async function seed() {
  const policiesDir = path.resolve(__dirname, "../../policies");
  const files = fs
    .readdirSync(policiesDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  console.log(`Found ${files.length} policy files.`);

  const allChunks = files.flatMap((file) => {
    const text = fs.readFileSync(path.join(policiesDir, file), "utf-8");
    const policyChunks = chunkPolicy(file, text);
    console.log(`  ${file}: ${policyChunks.length} chunk(s)`);
    return policyChunks;
  });

  console.log(`Total chunks: ${allChunks.length}. Generating embeddings...`);
  const embeddings = await embedTexts(allChunks.map((c) => c.content));

  console.log("Inserting into policy_chunks...");
  await replaceAllPolicyChunks(allChunks, embeddings);

  console.log(`Seeded ${allChunks.length} policy chunks.`);

  console.log("Inserting into tenant_policy_chunks for default tenant...");
  await upsertTenantPolicyChunks(DEFAULT_TENANT_ID, allChunks, embeddings);

  console.log(`Seeded ${allChunks.length} tenant policy chunks.`);
  await getPool().end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
