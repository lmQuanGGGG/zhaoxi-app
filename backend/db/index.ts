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

export function getDb() {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
