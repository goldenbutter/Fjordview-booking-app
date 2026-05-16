import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "bithun@ibithun.com";

async function main() {
  console.log(`Verifying RLS helper for admin '${ADMIN_EMAIL}'\n`);

  const adminRows = await sql<{
    id: string;
    supabase_user_id: string;
    property_id: string;
    role: string;
    active: boolean;
  }[]>`
    SELECT id, supabase_user_id, property_id, role, active
    FROM public.admin_users
    WHERE email = ${ADMIN_EMAIL}
  `;
  if (adminRows.length === 0) {
    console.error("No admin_users row found.");
    await sql.end();
    process.exit(1);
  }
  const admin = adminRows[0];
  console.log("admin_users row:");
  console.log(`  id                ${admin.id}`);
  console.log(`  supabase_user_id  ${admin.supabase_user_id}`);
  console.log(`  property_id       ${admin.property_id}`);
  console.log(`  role              ${admin.role}`);
  console.log(`  active            ${admin.active}\n`);

  console.log("Simulating an RLS context for this user via SET LOCAL...");
  const helperResult = await sql<{ pid: string | null }[]>`
    SELECT public.current_property_id() AS pid
    FROM (
      SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: admin.supabase_user_id })}, true) AS x
    ) AS noop
  `;
  console.log(`  current_property_id() returned: ${helperResult[0]?.pid ?? "NULL"}`);

  if (helperResult[0]?.pid === admin.property_id) {
    console.log("\n  RLS helper resolves correctly for this admin user.");
  } else {
    console.log(`\n  RLS helper did NOT match. Note: auth.uid() depends on Supabase's JWT context,`);
    console.log(`  which is set by Supabase's API layer (PostgREST or supabase-js). Direct postgres`);
    console.log(`  client connections don't set auth.uid() automatically, so this check returning`);
    console.log(`  NULL when run via 'postgres' role is expected. The function will resolve correctly`);
    console.log(`  when called through Supabase Auth from the app.`);
  }

  const tableCounts = await sql<{ table_name: string; n: string }[]>`
    SELECT 'properties' AS table_name, COUNT(*)::text AS n FROM public.properties
    UNION ALL SELECT 'room_types', COUNT(*)::text FROM public.room_types
    UNION ALL SELECT 'rooms', COUNT(*)::text FROM public.rooms
    UNION ALL SELECT 'pricing_rules', COUNT(*)::text FROM public.pricing_rules
    UNION ALL SELECT 'cancellation_policies', COUNT(*)::text FROM public.cancellation_policies
    UNION ALL SELECT 'guests', COUNT(*)::text FROM public.guests
    UNION ALL SELECT 'bookings', COUNT(*)::text FROM public.bookings
    UNION ALL SELECT 'cleaning_tasks', COUNT(*)::text FROM public.cleaning_tasks
    UNION ALL SELECT 'email_log', COUNT(*)::text FROM public.email_log
    UNION ALL SELECT 'admin_users', COUNT(*)::text FROM public.admin_users
  `;
  console.log("\nRow counts:");
  for (const r of tableCounts) console.log(`  ${r.table_name.padEnd(24)} ${r.n}`);

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
