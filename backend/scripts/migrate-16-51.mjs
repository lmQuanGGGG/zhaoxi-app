import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists partner_payment_transactions(
   id uuid primary key default gen_random_uuid(),
   request_id uuid not null references service_requests(id) on delete cascade,
   organization_id uuid not null references organizations(id) on delete cascade,
   intent_id varchar(120) not null,
   provider varchar(40) not null,
   merchant_id varchar(180) not null,
   provider_reference varchar(220),
   event_type varchar(40) not null,
   status varchar(40) not null,
   amount integer not null default 0,
   currency varchar(3) not null default 'VND',
   source varchar(40) not null,
   idempotency_key varchar(220) not null,
   payload jsonb not null default '{}'::jsonb,
   created_at timestamptz not null default now()
 )`;
 await sql`create index if not exists partner_payment_transactions_request_idx on partner_payment_transactions(request_id)`;
 await sql`create index if not exists partner_payment_transactions_org_idx on partner_payment_transactions(organization_id)`;
 await sql`create index if not exists partner_payment_transactions_intent_idx on partner_payment_transactions(intent_id)`;
 await sql`create index if not exists partner_payment_transactions_created_idx on partner_payment_transactions(created_at)`;
 await sql`create unique index if not exists partner_payment_transactions_idempotency_unique on partner_payment_transactions(idempotency_key)`;
 console.log("Sprint 16.51 partner payment transaction & reconciliation log migration applied.");
}finally{await sql.end({timeout:5})}
