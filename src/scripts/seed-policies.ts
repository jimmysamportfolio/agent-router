import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@/lib/db/pool";
import { chunkPolicy, embedTexts } from "@/lib/utils/embedding";
import { replaceAllPolicyChunks } from "@/lib/db/queries/policies";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  const policiesDir = path.resolve(__dirname, "../../policies");
  const files = fs
    .readdirSync(policiesDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  console.log(`Found ${files.length} policy files.`);

  const allChunks = files.flatMap((file) => {
    const text = fs.readFileSync(path.join(policiesDir, file), "utf-8");
    const chunks = chunkPolicy(file, text);
    console.log(`  ${file}: ${chunks.length} chunk(s)`);
    return chunks;
  });

  console.log(`Total chunks: ${allChunks.length}. Generating embeddings...`);
  const embeddings = await embedTexts(allChunks.map((c) => c.content));

  console.log("Inserting into policy_chunks...");
  await replaceAllPolicyChunks(allChunks, embeddings);

  console.log(`Seeded ${allChunks.length} policy chunks.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
