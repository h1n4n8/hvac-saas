-- ===========================================================================
-- Auth v2: two-stage owner registration, company-code login, invite codes,
-- and employee approval. This migration REPLACES 0001 and assumes a clean
-- slate (test data is disposable). It drops the business tables and recreates
-- them with the new auth-related columns.
--
-- Before running this, also delete the existing test users in
-- Supabase Dashboard > Authentication > Users (auth.users is managed by
-- Supabase Auth and is not touched here).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- Drop in dependency order (children first).
drop table if exists public.past_quote_imports cascade;
drop table if exists public.quotes cascade;
drop table if exists public.quote_items cascade;
drop table if exists public.invite_codes cascade;
drop table if exists public.users cascade;
drop table if exists public.companies cascade;

-- ---------------------------------------------------------------------------
-- companies
--   status: 'pending'  = 仮登録 (stage 1 done, details not yet filled)
--           'active'   = 本登録済み (can issue invite codes)
--   company_code: human-friendly unique tenant identifier used at login.
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  company_code text not null unique,
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'active')),
  industry text,
  employee_count int,
  postal_code text,
  address text,
  phone text,
  plan_status text not null default 'free' check (plan_status in ('free', 'trial', 'paid', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users: one row per auth.users member, scoped to a company.
--   role:   'owner'    = 社長 (manage company, issue invites, approve staff)
--           'employee' = 従業員 (use the app only)
--   status: 'pending'  = 承認待ち (registered via invite, awaiting approval)
--           'approved' = 利用可能
--           'rejected' = 却下
-- email is stored for display / per-company listing (auth.users also has it).
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'employee' check (role in ('owner', 'employee')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index users_company_id_idx on public.users (company_id);
-- Email is unique within a company (enforced here; global Auth uniqueness is
-- handled by Supabase Auth itself).
create unique index users_company_email_idx on public.users (company_id, lower(email));

-- ---------------------------------------------------------------------------
-- invite_codes: issued by a 本登録済み owner. 24h expiry, unlimited uses.
-- ---------------------------------------------------------------------------
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  code text not null,
  created_by uuid references public.users (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create index invite_codes_company_id_idx on public.invite_codes (company_id);

-- ---------------------------------------------------------------------------
-- quote_items
-- ---------------------------------------------------------------------------
create table public.quote_items (
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

create index quote_items_company_id_idx on public.quote_items (company_id);

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  owner_id uuid references public.users (id) on delete set null,
  quote_no text not null,
  project_name text not null,
  customer_name text not null,
  customer_email text,
  items jsonb not null default '[]'::jsonb,
  notes text default '',
  subtotal numeric(12, 0) not null default 0,
  discount numeric(12, 0) not null default 0,
  tax_amount numeric(12, 0) not null default 0,
  total numeric(12, 0) not null default 0,
  status text not null default '作成中' check (status in ('作成中', '未確定', '確定')),
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_company_id_idx on public.quotes (company_id);
create index quotes_owner_id_idx on public.quotes (owner_id);

-- ---------------------------------------------------------------------------
-- past_quote_imports
-- ---------------------------------------------------------------------------
create table public.past_quote_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  uploaded_by uuid references public.users (id) on delete set null,
  file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'parsed', 'needs_review', 'failed')),
  parsed_result jsonb,
  column_mapping jsonb,
  created_at timestamptz not null default now()
);

create index past_quote_imports_company_id_idx on public.past_quote_imports (company_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.quote_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.invite_codes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quotes enable row level security;
alter table public.past_quote_imports enable row level security;

-- The caller's company_id, but only once they are APPROVED. Pending/rejected
-- users therefore get no access to business data via the policies below.
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.users where id = auth.uid() and status = 'approved';
$$;

-- companies: any member (even pending) can read their OWN company row — this
-- is needed for the company-code check at login and the "承認待ち" screen.
-- Writes go through server routes using the service role key.
create policy "companies_select_member" on public.companies
  for select using (
    id in (select company_id from public.users where id = auth.uid())
  );

-- users: a user can always read their own row; approved members can read the
-- other approved members of their company. The owner's view of pending
-- applicants is served by a server route (service role), not by this policy.
create policy "users_select_self" on public.users
  for select using (id = auth.uid());
create policy "users_select_approved_coworkers" on public.users
  for select using (company_id = public.current_company_id() and status = 'approved');
create policy "users_update_self" on public.users
  for update using (id = auth.uid());

-- invite_codes: no client access (validation/issuance run server-side with
-- the service role). RLS is enabled with no policies = deny all.

-- quote_items: full CRUD scoped to the caller's (approved) company.
create policy "quote_items_select_own_company" on public.quote_items
  for select using (company_id = public.current_company_id());
create policy "quote_items_insert_own_company" on public.quote_items
  for insert with check (company_id = public.current_company_id());
create policy "quote_items_update_own_company" on public.quote_items
  for update using (company_id = public.current_company_id());
create policy "quote_items_delete_own_company" on public.quote_items
  for delete using (company_id = public.current_company_id());

-- quotes: full CRUD scoped to the caller's (approved) company.
create policy "quotes_select_own_company" on public.quotes
  for select using (company_id = public.current_company_id());
create policy "quotes_insert_own_company" on public.quotes
  for insert with check (company_id = public.current_company_id());
create policy "quotes_update_own_company" on public.quotes
  for update using (company_id = public.current_company_id());
create policy "quotes_delete_own_company" on public.quotes
  for delete using (company_id = public.current_company_id());

-- past_quote_imports: scoped to the caller's (approved) company.
create policy "past_quote_imports_select_own_company" on public.past_quote_imports
  for select using (company_id = public.current_company_id());
create policy "past_quote_imports_insert_own_company" on public.past_quote_imports
  for insert with check (company_id = public.current_company_id());
