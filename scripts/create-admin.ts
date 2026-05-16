import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "bithun@ibithun.com";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Bithun";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const PROPERTY_SLUG = process.env.DEFAULT_PROPERTY_SLUG ?? "fjordview";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const properties = await db
    .select({ id: schema.properties.id, name: schema.properties.name })
    .from(schema.properties)
    .where(eq(schema.properties.slug, PROPERTY_SLUG));

  if (properties.length === 0) {
    console.error(`No property found with slug '${PROPERTY_SLUG}'. Run 'npm run seed' first.`);
    await client.end();
    process.exit(1);
  }
  const property = properties[0];
  console.log(`Linking admin user to property '${property.name}' (${property.id})`);

  let supabaseUserId: string | undefined;

  console.log(`Looking up Supabase Auth user for ${ADMIN_EMAIL}...`);
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error(listErr);
    await client.end();
    process.exit(1);
  }
  const existing = usersList.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (existing) {
    supabaseUserId = existing.id;
    console.log(`  found existing auth user (${supabaseUserId})`);
    if (ADMIN_PASSWORD) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(supabaseUserId, {
        password: ADMIN_PASSWORD,
      });
      if (updErr) {
        console.error(updErr);
        await client.end();
        process.exit(1);
      }
      console.log(`  password updated for existing user`);
    }
  } else {
    console.log(`  not found, creating new auth user...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
      ...(ADMIN_PASSWORD ? { password: ADMIN_PASSWORD } : {}),
    });
    if (createErr || !created.user) {
      console.error(createErr ?? "createUser returned no user");
      await client.end();
      process.exit(1);
    }
    supabaseUserId = created.user.id;
    console.log(`  created auth user (${supabaseUserId})${ADMIN_PASSWORD ? " with password" : ""}`);
  }

  const adminExisting = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.supabaseUserId, supabaseUserId!));

  if (adminExisting.length > 0) {
    console.log(`  admin_users row already exists for this user, skipping insert`);
  } else {
    await db.insert(schema.adminUsers).values({
      propertyId: property.id,
      supabaseUserId: supabaseUserId!,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "owner",
      active: true,
    });
    console.log(`  inserted admin_users row (owner role)`);
  }

  const verify = await db
    .select({
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      role: schema.adminUsers.role,
      propertyId: schema.adminUsers.propertyId,
    })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.supabaseUserId, supabaseUserId!));

  console.log(`\nAdmin user wired:`);
  console.log(`  supabase_user_id  ${supabaseUserId}`);
  console.log(`  email             ${verify[0].email}`);
  console.log(`  role              ${verify[0].role}`);
  console.log(`  property_id       ${verify[0].propertyId}`);

  console.log(`\nNext: sign in at http://localhost:3000/login as ${ADMIN_EMAIL}.`);
  console.log(`(LOCAL_DEMO_MODE=true currently bypasses auth; flip to false after testing.)`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
