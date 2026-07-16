import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DetailView from "./DetailView";
import { createClient } from "@/lib/supabase/server";
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
        companyPostalCode={company?.postal_code ?? null}
        companyAddress={company?.address ?? null}
        companyPhone={company?.phone ?? null}
        personInCharge={personInCharge}
      />
    </AppShell>
  );
}
