import dotenv from "dotenv";import postgres from "postgres";dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
await sql`create table if not exists restaurant_commission_policies(id uuid primary key default gen_random_uuid(),scope varchar(24) not null default 'global',organization_id uuid references organizations(id) on delete cascade,mode varchar(24) not null default 'percentage',percentage_bps integer not null default 0,fixed_per_order integer not null default 0,enabled boolean not null default false,effective_from timestamptz,effective_to timestamptz,note varchar(500),updated_by_user_id uuid references users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`create index if not exists restaurant_commission_policies_scope_idx on restaurant_commission_policies(scope)`;
await sql`create index if not exists restaurant_commission_policies_org_idx on restaurant_commission_policies(organization_id)`;
await sql`create index if not exists restaurant_commission_policies_enabled_idx on restaurant_commission_policies(enabled)`;
console.log("Sprint 16.35 restaurant commission policy migration applied.");
}finally{await sql.end({timeout:5})}
