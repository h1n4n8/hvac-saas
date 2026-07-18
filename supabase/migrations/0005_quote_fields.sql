-- Per-field quote customization: which fields appear on the quote sheet, plus
-- the extra company-level and per-quote data those fields need. All additive
-- and idempotent (safe to run more than once).

-- Company-level static values shown on every quote.
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists bank_info text;
alter table public.companies add column if not exists invoice_reg_number text;
alter table public.companies add column if not exists default_validity_days text;
alter table public.companies add column if not exists default_payment_terms text;
-- On/off flags for each quote field, e.g. {"siteAddress": false, ...}.
-- Missing keys default to true in the app.
alter table public.companies add column if not exists quote_field_settings jsonb not null default '{}'::jsonb;

-- Per-quote values for the newly toggleable fields.
alter table public.quotes add column if not exists customer_contact text;
alter table public.quotes add column if not exists site_address text;
alter table public.quotes add column if not exists construction_period text;
