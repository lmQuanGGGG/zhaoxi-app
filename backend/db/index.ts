import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const value = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!value) {
    throw new Error("Missing POSTGRES_URL or DATABASE_URL environment variable.");
  }
  return value;
}

let client: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

// One pool and one Drizzle instance per server instance. Warm serverless
// invocations reuse both, so requests skip the TLS handshake to Postgres and
// Drizzle does not rebuild its relational config for every getDb() call.
export function getDb() {
  if (db) return db;
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  db = drizzle(client, { schema });
  return db;
}

export type Database = ReturnType<typeof getDb>;
