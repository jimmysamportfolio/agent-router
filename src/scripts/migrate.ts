import fs from "fs";
import path from "path";
import { pool, query } from "@/lib/db";

async function migrate() {
  // Create tracking table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const applied = await query<{ name: string }>("SELECT name FROM _migrations ORDER BY name");
  const appliedSet = new Set(applied.map((r) => r.name));

  // Read migration files
  const migrationsDir = path.resolve(__dirname, "../migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`  apply: ${file}`);

    await query("BEGIN");
    try {
      await query(sql);
      await query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await query("COMMIT");
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }

  console.log("Migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});