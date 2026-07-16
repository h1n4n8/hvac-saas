-- Company logo shown on the quote sheet. Stored as a small data URL (base64)
-- directly on the company row to avoid setting up a Storage bucket; the app
-- downscales images before saving so the value stays small.
alter table public.companies add column if not exists logo_url text;
