import postgres from"postgres";import dotenv from"dotenv";dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!url)throw new Error("DATABASE_URL/POSTGRES_URL missing");const sql=postgres(url,{ssl:"require"});
try{
await sql`create table if not exists support_knowledge_articles(
 id uuid primary key default gen_random_uuid(),
 slug varchar(180) not null,
 locale varchar(16) not null default 'vi-VN',
 title varchar(220) not null,
 summary text not null default '',
 body text not null,
 category varchar(80) not null default 'general',
 tags jsonb not null default '[]'::jsonb,
 status varchar(24) not null default 'draft',
 published_at timestamptz,
 created_by_user_id uuid references users(id) on delete set null,
 updated_by_user_id uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(slug,locale)
)`;
await sql`create index if not exists support_knowledge_articles_status_idx on support_knowledge_articles(status,locale)`;
await sql`create index if not exists support_knowledge_articles_category_idx on support_knowledge_articles(category,locale)`;
await sql`create table if not exists support_knowledge_feedback(
 id uuid primary key default gen_random_uuid(),
 article_id uuid not null references support_knowledge_articles(id) on delete cascade,
 user_id uuid references users(id) on delete set null,
 helpful boolean not null,
 comment text,
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists support_knowledge_feedback_article_idx on support_knowledge_feedback(article_id,created_at)`;
await sql`create table if not exists support_knowledge_views(
 id uuid primary key default gen_random_uuid(),
 article_id uuid not null references support_knowledge_articles(id) on delete cascade,
 user_id uuid references users(id) on delete set null,
 source varchar(40) not null default 'help_center',
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists support_knowledge_views_article_idx on support_knowledge_views(article_id,created_at)`;
console.log("ZhaoXi 17.2 cumulative Support Knowledge & Self-Service migration applied.");
}finally{await sql.end()}