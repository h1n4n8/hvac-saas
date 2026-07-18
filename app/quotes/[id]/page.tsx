import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DetailView from "./DetailView";
import { createClient } from "@/lib/supabase/server";
import { getCompanyLogo, getShowLogoOnQuote, getCompanyQuoteConfig } from "@/lib/companyLogo";
import type { Quote } from "@/lib/types";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();

  if (!quote) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("name, postal_code, address, phone")
    .eq("id", quote.company_id)
    .maybeSingle();
  const logoUrl = (await getShowLogoOnQuote(supabase, quote.company_id))
    ? await getCompanyLogo(supabase, quote.company_id)
    : null;
  const config = await getCompanyQuoteConfig(supabase, quote.company_id);

  let personInCharge = "";
  if (quote.owner_id) {
    const { data: owner } = await supabase.from("users").select("name").eq("id", quote.owner_id).maybeSingle();
    personInCharge = owner?.name ?? "";
  }

  return (
    <AppShell>
      <DetailView
        quote={quote as Quote}
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
