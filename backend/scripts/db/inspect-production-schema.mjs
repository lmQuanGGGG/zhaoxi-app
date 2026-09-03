import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL/POSTGRES_URL/POSTGRES_PRISMA_URL is not set.');
  process.exit(2);
}

const outDir = path.resolve('artifacts/schema');
fs.mkdirSync(outDir, { recursive: true });

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 5,
  ssl: databaseUrl.includes('localhost') ? false : 'require',
});

const q = async (strings, ...values) => sql(strings, ...values);

try {
  const [dbInfo] = await q`select current_database() as database, current_schema() as schema, version() as server_version`;

  const tables = await q`
    select n.nspname as schema_name, c.relname as table_name, c.relkind as relation_kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema')
      and c.relkind in ('r','p')
    order by n.nspname, c.relname`;

  const columns = await q`
    select table_schema, table_name, ordinal_position, column_name, data_type,
           udt_name, is_nullable, column_default, identity_generation, is_generated
    from information_schema.columns
    where table_schema not in ('pg_catalog','information_schema')
    order by table_schema, table_name, ordinal_position`;

  const constraints = await q`
    select n.nspname as schema_name, c.relname as table_name, con.conname as constraint_name,
           con.contype as constraint_type, pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema')
    order by n.nspname, c.relname, con.conname`;

  const indexes = await q`
    select schemaname as schema_name, tablename as table_name, indexname as index_name, indexdef as definition
    from pg_indexes
    where schemaname not in ('pg_catalog','information_schema')
    order by schemaname, tablename, indexname`;

  const extensions = await q`
    select extname as extension_name, extversion as version
    from pg_extension
    order by extname`;

  const sequences = await q`
    select sequence_schema as schema_name, sequence_name, data_type, start_value, minimum_value, maximum_value, increment, cycle_option
    from information_schema.sequences
    where sequence_schema not in ('pg_catalog','information_schema')
    order by sequence_schema, sequence_name`;

  const snapshot = {
    generatedAt: new Date().toISOString(),
    mode: 'READ_ONLY_SCHEMA_SNAPSHOT',
    database: dbInfo?.database ?? null,
    currentSchema: dbInfo?.schema ?? null,
    serverVersion: dbInfo?.server_version ?? null,
    counts: {
      tables: tables.length,
      columns: columns.length,
      constraints: constraints.length,
      indexes: indexes.length,
      extensions: extensions.length,
      sequences: sequences.length,
    },
    tables,
    columns,
    constraints,
    indexes,
    extensions,
    sequences,
  };

  const target = path.join(outDir, 'production-schema.json');
  fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`READ_ONLY production schema snapshot written: ${target}`);
  console.log(`Tables=${tables.length} Columns=${columns.length} Constraints=${constraints.length} Indexes=${indexes.length}`);
} finally {
  await sql.end({ timeout: 5 });
}
