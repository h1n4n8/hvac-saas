import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeFieldSettings, type QuoteFieldSettings } from "@/lib/quoteFields";

export interface CompanyQuoteConfig {
  email: string | null;
  bankInfo: string | null;
  invoiceRegNumber: string | null;
  defaultValidityDays: string | null;
  defaultPaymentTerms: string | null;
  fieldSettings: QuoteFieldSettings;
}

const DEFAULT_QUOTE_CONFIG: CompanyQuoteConfig = {
  email: null,
  bankInfo: null,
  invoiceRegNumber: null,
  defaultValidityDays: null,
  defaultPaymentTerms: null,
  fieldSettings: mergeFieldSettings(null),
};

// Best-effort fetch of the 0005 quote-customization columns. If those columns
// don't exist yet (migration not run), returns defaults so quotes still render.
export async function getCompanyQuoteConfig(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyQuoteConfig> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("email, bank_info, invoice_reg_number, default_validity_days, default_payment_terms, quote_field_settings")
      .eq("id", companyId)
      .maybeSingle();
    if (error || !data) return DEFAULT_QUOTE_CONFIG;
    const row = data as {
      email: string | null;
      bank_info: string | null;
      invoice_reg_number: string | null;
      default_validity_days: string | null;
      default_payment_terms: string | null;
      quote_field_settings: unknown;
    };
    return {
      email: row.email ?? null,
      bankInfo: row.bank_info ?? null,
      invoiceRegNumber: row.invoice_reg_number ?? null,
      defaultValidityDays: row.default_validity_days ?? null,
      defaultPaymentTerms: row.default_payment_terms ?? null,
      fieldSettings: mergeFieldSettings(row.quote_field_settings),
    };
  } catch {
    return DEFAULT_QUOTE_CONFIG;
  }
}

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
