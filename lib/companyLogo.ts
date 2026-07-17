import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Best-effort logo fetch that tolerates the `logo_url` column not existing
// yet (i.e. before the 0003 migration has been run). Returns null on any
// error so the rest of the app keeps working without the migration.
export async function getCompanyLogo(supabase: SupabaseClient, companyId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("logo_url")
      .eq("id", companyId)
      .maybeSingle();
    if (error) return null;
    return (data as { logo_url: string | null } | null)?.logo_url ?? null;
  } catch {
    return null;
  }
}

// Whether to show the logo on the quote sheet. Defaults to true, and tolerates
// the column not existing yet (returns true) so quotes render either way.
export async function getShowLogoOnQuote(supabase: SupabaseClient, companyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("show_logo_on_quote")
      .eq("id", companyId)
      .maybeSingle();
    if (error) return true;
    const v = (data as { show_logo_on_quote: boolean | null } | null)?.show_logo_on_quote;
    return v ?? true;
  } catch {
    return true;
  }
}
