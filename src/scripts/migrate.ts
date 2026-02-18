import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@/lib/db/pool";
import {
  ensureMigrationsTable,
  getAppliedMigrations,
  applyMigration,
} from "@/lib/db/queries/migrations";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const migrationsDir = path.resolve(__dirname, "../lib/db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip: ${file}`);
      continue;
    }

    console.log(`  apply: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await applyMigration(file, sql);
  }

  console.log("Migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
