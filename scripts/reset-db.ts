import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

async function main() {
  console.log("Dropping public-schema GuestHub tables (CASCADE)...");
  const tables = [
    "cleaning_tasks",
    "email_log",
    "bookings",
    "guests",
    "cancellation_policies",
    "pricing_rules",
    "rooms",
    "room_types",
    "admin_users",
    "properties",
  ];
  for (const t of tables) {
    await sql.unsafe(`DROP TABLE IF EXISTS public.${t} CASCADE`);
    console.log(`  dropped ${t}`);
  }

  console.log("Dropping public.current_property_id() helper if present...");
  await sql.unsafe(`DROP FUNCTION IF EXISTS public.current_property_id() CASCADE`);

  console.log("Clearing drizzle migration history...");
  await sql.unsafe(`TRUNCATE TABLE drizzle.__drizzle_migrations`).catch(() => {});

  await sql.end();
  console.log("\nReset complete.");
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
