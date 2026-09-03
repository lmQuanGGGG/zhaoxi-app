import fs from "node:fs";
import postgres from "postgres";
const manifest = JSON.parse(fs.readFileSync("migrations/manifest-19.0.0.json", "utf8"));
const connection = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connection) throw new Error("Database URL is required");
const sql = postgres(connection, { max: 1, prepare: false });
try {
  await sql.begin(async (tx) => {
    await tx`set transaction read only`;
    const rows = await tx`select tablename from pg_catalog.pg_tables where schemaname='public' order by tablename`;
    const names = new Set(rows.map((r) => r.tablename));
    const missing = manifest.targets.filter((t) => !names.has(t));
    if (names.size !== manifest.expectedPublicTablesAfter || missing.length) throw new Error(`B2A live verification failed: public_tables=${names.size}, missing=${missing.join(",") || "none"}`);
    console.log(`ZhaoXi 19.0.0 Sprint B2A live verification PASS: public_tables=${names.size}, all 6 gap-closure tables present.`);
  });
} finally { await sql.end({ timeout: 5 }); }
