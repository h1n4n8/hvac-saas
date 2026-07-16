import AppShell from "@/components/AppShell";
import PreviewView from "./PreviewView";
import { createClient } from "@/lib/supabase/server";

export default async function QuotePreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("name, companies ( name, postal_code, address, phone, logo_url )")
    .eq("id", user!.id)
    .maybeSingle();
  const company = (profile as unknown as {
    companies: {
      name: string;
      postal_code: string | null;
      address: string | null;
      phone: string | null;
      logo_url: string | null;
    } | null;
  })?.companies;
  const personInCharge = (profile as unknown as { name: string } | null)?.name ?? "";

  return (
    <AppShell>
      <PreviewView
        companyName={company?.name ?? ""}
        companyLogoUrl={company?.logo_url ?? null}
        companyPostalCode={company?.postal_code ?? null}
        companyAddress={company?.address ?? null}
        companyPhone={company?.phone ?? null}
        personInCharge={personInCharge}
      />
    </AppShell>
  );
}
