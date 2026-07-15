-- Multi-tenant schema for the equipment-contractor SaaS MVP.
-- Tenancy model: every business table carries company_id and is locked
-- down with RLS so a signed-in user only ever sees rows from their own
-- company. auth.users (Supabase Auth) is the identity source; public.users
-- is a profile row keyed 1:1 to auth.users via id, scoped to a company.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  employee_count int,
  -- Simple freemium gate for now; real billing is out of scope for the MVP.
  plan_status text not null default 'free' check (plan_status in ('free', 'trial', 'paid', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users: one row per auth.users member, scoped to a company.
-- Every member can read every other member's rows in the same company
-- (spec: no strict per-role permissions, only "my quotes vs company quotes"
-- view toggles), so RLS below only ever filters by company_id.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists users_company_id_idx on public.users (company_id);

-- ---------------------------------------------------------------------------
-- quote_items: item/unit-price patterns accumulated per company, seeded
-- from past-quote imports and reused as button-selectable presets when
-- building a new quote.
-- ---------------------------------------------------------------------------
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null default 'その他',
  name text not null,
  unit text not null default '式',
  unit_price numeric(12, 0) not null default 0,
  usage_count int not null default 0,
  source text not null default 'manual' check (source in ('manual', 'ai_import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_items_company_id_idx on public.quote_items (company_id);

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  owner_id uuid references public.users (id) on delete set null,
  quote_no text not null,
  project_name text not null,
  customer_name text not null,
  customer_email text,
  -- Line items kept as jsonb for MVP speed; safe to normalize into a
  -- quote_line_items table later without touching this column's readers.
  items jsonb not null default '[]'::jsonb,
  notes text default '',
  subtotal numeric(12, 0) not null default 0,
  discount numeric(12, 0) not null default 0,
  tax_amount numeric(12, 0) not null default 0,
  total numeric(12, 0) not null default 0,
  status text not null default '作成中' check (status in ('作成中', '未確定', '確定')),
  -- Informational only: true when the draft originated from AI suggestions.
  -- 金額に関わる生成結果は必ず人が確認・編集してから確定するため、この
  -- フラグが確定処理をバイパスすることはない。
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_company_id_idx on public.quotes (company_id);
create index if not exists quotes_owner_id_idx on public.quotes (owner_id);

-- ---------------------------------------------------------------------------
-- past_quote_imports: upload history + AI parse results for onboarding.
-- ---------------------------------------------------------------------------
create table if not exists public.past_quote_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  uploaded_by uuid references public.users (id) on delete set null,
  file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'parsed', 'needs_review', 'failed')),
  parsed_result jsonb,
  column_mapping jsonb,
  created_at timestamptz not null default now()
);

create index if not exists past_quote_imports_company_id_idx on public.past_quote_imports (company_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.companies;
create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.quote_items;
create trigger set_updated_at before update on public.quote_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.quotes;
create trigger set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.quote_items enable row level security;
alter table public.quotes enable row level security;
alter table public.past_quote_imports enable row level security;

-- Helper: the caller's company_id, looked up once per statement.
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid();
$$;

-- companies: members can read their own company. Row creation happens in
-- app/api/onboarding/create-company via the service role key, before the
-- new user has a users row (and therefore before current_company_id()
-- could resolve), so no insert policy is granted here.
create policy "companies_select_own" on public.companies
  for select using (id = public.current_company_id());

-- users: members can see profiles within their own company; a user can
-- only edit their own profile row.
create policy "users_select_same_company" on public.users
  for select using (company_id = public.current_company_id());

create policy "users_update_self" on public.users
  for update using (id = auth.uid());

-- quote_items: full CRUD scoped to company_id.
create policy "quote_items_select_own_company" on public.quote_items
  for select using (company_id = public.current_company_id());

create policy "quote_items_insert_own_company" on public.quote_items
  for insert with check (company_id = public.current_company_id());

create policy "quote_items_update_own_company" on public.quote_items
  for update using (company_id = public.current_company_id());

create policy "quote_items_delete_own_company" on public.quote_items
  for delete using (company_id = public.current_company_id());

-- quotes: full CRUD scoped to company_id. The dashboard's "mine" vs
-- "company-wide" toggle is a query-level filter on owner_id, not a
-- permission split — everyone in the company can already read every quote.
create policy "quotes_select_own_company" on public.quotes
  for select using (company_id = public.current_company_id());

create policy "quotes_insert_own_company" on public.quotes
  for insert with check (company_id = public.current_company_id());

create policy "quotes_update_own_company" on public.quotes
  for update using (company_id = public.current_company_id());

create policy "quotes_delete_own_company" on public.quotes
  for delete using (company_id = public.current_company_id());

-- past_quote_imports: scoped to company_id.
create policy "past_quote_imports_select_own_company" on public.past_quote_imports
  for select using (company_id = public.current_company_id());

create policy "past_quote_imports_insert_own_company" on public.past_quote_imports
  for insert with check (company_id = public.current_company_id());

-- ---------------------------------------------------------------------------
-- Forward-compatibility notes (not created now, kept here so future
-- migrations know the intended shape):
--   - calendar_events(company_id, owner_id, ...)     for Google Calendar sync
--   - invoices(company_id, quote_id, ...)             for billing/invoicing
--   - company_integrations(company_id, provider,      for per-company OAuth
--       access_token, refresh_token, ...)             tokens (Google etc.)
-- All three follow the same company_id + RLS pattern established above.
-- ---------------------------------------------------------------------------
