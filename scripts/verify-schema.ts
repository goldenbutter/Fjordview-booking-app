import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  const tables = await sql<{ tablename: string; rowsecurity: boolean }[]>`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log("\nPublic tables:");
  for (const t of tables) console.log(`  ${t.tablename.padEnd(28)} RLS=${t.rowsecurity}`);

  const policies = await sql<{ tablename: string; policyname: string }[]>`
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log(`\nRLS policies: ${policies.length}`);
  for (const p of policies) console.log(`  ${p.tablename.padEnd(28)} "${p.policyname}"`);

  const indexes = await sql<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    ORDER BY indexname
  `;
  console.log(`\nCustom indexes: ${indexes.length}`);
  for (const i of indexes) console.log(`  ${i.indexname}`);

  const fn = await sql<{ proname: string }[]>`
    SELECT proname FROM pg_proc WHERE proname = 'property_id' AND pronamespace = 'auth'::regnamespace
  `;
  console.log(`\nauth.property_id() exists: ${fn.length === 1 ? "yes" : "NO"}`);

  const migrations = await sql<{ hash: string; created_at: string }[]>`
    SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id
  `;
  console.log(`\nApplied migrations: ${migrations.length}`);
  for (const m of migrations) console.log(`  ${m.hash}  ${m.created_at}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
