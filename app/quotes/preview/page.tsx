import AppShell from "@/components/AppShell";
import PreviewView from "./PreviewView";
import { createClient } from "@/lib/supabase/server";
import { getCompanyLogo, getShowLogoOnQuote, getCompanyQuoteConfig } from "@/lib/companyLogo";

export default async function QuotePreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("name, companies ( id, name, postal_code, address, phone )")
    .eq("id", user!.id)
    .maybeSingle();
  const company = (profile as unknown as {
    companies: {
      id: string;
      name: string;
      postal_code: string | null;
      address: string | null;
      phone: string | null;
    } | null;
  })?.companies;
  const personInCharge = (profile as unknown as { name: string } | null)?.name ?? "";

  const companyId = company?.id;
  const logoUrl =
    companyId && (await getShowLogoOnQuote(supabase, companyId)) ? await getCompanyLogo(supabase, companyId) : null;
  const config = companyId
    ? await getCompanyQuoteConfig(supabase, companyId)
    : {
        email: null,
        bankInfo: null,
        invoiceRegNumber: null,
        defaultValidityDays: null,
        defaultPaymentTerms: null,
        fieldSettings: (await import("@/lib/quoteFields")).DEFAULT_QUOTE_FIELD_SETTINGS,
      };

  return (
    <AppShell>
      <PreviewView
        companyName={company?.name ?? ""}
        companyLogoUrl={logoUrl}
        companyPostalCode={company?.postal_code ?? null}
        companyAddress={company?.address ?? null}
        companyPhone={company?.phone ?? null}
        companyEmail={config.email}
        invoiceRegNo={config.invoiceRegNumber}
        bankInfo={config.bankInfo}
        defaultValidityDays={config.defaultValidityDays}
        defaultPaymentTerms={config.defaultPaymentTerms}
        personInCharge={personInCharge}
        fieldSettings={config.fieldSettings}
      />
    </AppShell>
  );
}
