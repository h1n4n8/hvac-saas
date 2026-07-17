import AppShell from "@/components/AppShell";
import PreviewView from "./PreviewView";
import { createClient } from "@/lib/supabase/server";
import { getCompanyLogo } from "@/lib/companyLogo";

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
  const logoUrl = company?.id ? await getCompanyLogo(supabase, company.id) : null;

  return (
    <AppShell>
      <PreviewView
        companyName={company?.name ?? ""}
        companyLogoUrl={logoUrl}
        companyPostalCode={company?.postal_code ?? null}
        companyAddress={company?.address ?? null}
        companyPhone={company?.phone ?? null}
        personInCharge={personInCharge}
      />
    </AppShell>
  );
}
