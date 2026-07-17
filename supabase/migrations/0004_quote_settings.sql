-- Quote display settings on the company. Adds the logo column (idempotent, so
-- this also covers 0003 if it wasn't run) and a toggle for showing the logo on
-- the quote sheet. Both are safe to run more than once.
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists show_logo_on_quote boolean not null default true;
