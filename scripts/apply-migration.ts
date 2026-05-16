import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "drizzle/migrations";

const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 30,
});

async function ensureMigrationsTable() {
  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS drizzle;
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    );
  `);
}

async function applied(): Promise<Set<string>> {
  const rows = await sql<{ hash: string }[]>`SELECT hash FROM drizzle.__drizzle_migrations`;
  return new Set(rows.map((r) => r.hash));
}

function splitStatements(content: string): string[] {
  return content
    .split(/-->\s*statement-breakpoint/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  await ensureMigrationsTable();
  const done = await applied();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const fullPath = join(MIGRATIONS_DIR, file);
    const content = readFileSync(fullPath, "utf8");
    const hash = file.replace(/\.sql$/, "");

    if (done.has(hash)) {
      console.log(`SKIP ${file} (already applied)`);
      continue;
    }

    const statements = splitStatements(content);
    console.log(`\nAPPLY ${file} (${statements.length} statements)`);

    let i = 0;
    for (const stmt of statements) {
      i += 1;
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      process.stdout.write(`  [${i}/${statements.length}] ${preview}... `);
      try {
        await sql.unsafe(stmt);
        process.stdout.write("ok\n");
      } catch (err) {
        process.stdout.write("FAIL\n");
        console.error("---- statement ----");
        console.error(stmt);
        console.error("---- error ----");
        console.error(err);
        await sql.end();
        process.exit(1);
      }
    }

    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
    console.log(`  recorded as applied`);
  }

  await sql.end();
  console.log("\nMigration complete.");
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
