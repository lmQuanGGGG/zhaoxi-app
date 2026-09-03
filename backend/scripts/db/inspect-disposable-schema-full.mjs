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

try {
  const snapshot = await sql.begin(async tx => {
    await tx`set transaction read only`;
    const [dbInfo] = await tx`select current_database() as database, current_schema() as schema, version() as server_version`;

  const tables = await tx`
    select n.nspname as schema_name, c.relname as table_name, c.relkind as relation_kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema')
      and c.relkind in ('r','p')
    order by n.nspname, c.relname`;

  const columns = await tx`
    select table_schema, table_name, ordinal_position, column_name, data_type,
           udt_schema, udt_name, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale,
           datetime_precision, identity_generation, is_generated
    from information_schema.columns
    where table_schema not in ('pg_catalog','information_schema')
    order by table_schema, table_name, ordinal_position`;

  const constraints = await tx`
    select n.nspname as schema_name, c.relname as table_name, con.conname as constraint_name,
           con.contype as constraint_type, pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema')
    order by n.nspname, c.relname, con.conname`;

  const indexes = await tx`
    select schemaname as schema_name, tablename as table_name, indexname as index_name, indexdef as definition
    from pg_indexes
    where schemaname not in ('pg_catalog','information_schema')
    order by schemaname, tablename, indexname`;

  const enumValues = await tx`
    select n.nspname as schema_name, t.typname as enum_name, e.enumsortorder as sort_order, e.enumlabel as enum_value
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname not in ('pg_catalog','information_schema')
    order by n.nspname, t.typname, e.enumsortorder`;

  const extensions = await tx`
    select extname as extension_name, extversion as version
    from pg_extension order by extname`;

  const sequences = await tx`
    select sequence_schema as schema_name, sequence_name, data_type, start_value,
           minimum_value, maximum_value, increment, cycle_option
    from information_schema.sequences
    where sequence_schema not in ('pg_catalog','information_schema')
    order by sequence_schema, sequence_name`;

    return {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_FULL_SCHEMA_SNAPSHOT',
      database: dbInfo?.database ?? null,
      currentSchema: dbInfo?.schema ?? null,
      serverVersion: dbInfo?.server_version ?? null,
      counts: {
        tables: tables.length,
        columns: columns.length,
        constraints: constraints.length,
        indexes: indexes.length,
        enumValues: enumValues.length,
        extensions: extensions.length,
        sequences: sequences.length,
      },
      tables, columns, constraints, indexes, enumValues, extensions, sequences,
    };
  });

  const target = path.join(outDir, 'disposable-schema-full.json');
  fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`READ_ONLY full disposable schema snapshot written: ${target}`);
  console.log(`Tables=${snapshot.counts.tables} Columns=${snapshot.counts.columns} Constraints=${snapshot.counts.constraints} Indexes=${snapshot.counts.indexes} EnumValues=${snapshot.counts.enumValues}`);
} finally {
  await sql.end({ timeout: 5 });
}
