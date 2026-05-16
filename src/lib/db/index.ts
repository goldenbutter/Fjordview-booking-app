import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database access");
  }

  if (!client) {
    client = postgres(databaseUrl, { prepare: false });
  }

  if (!db) {
    db = drizzle(client, { schema });
  }

  return db;
}
