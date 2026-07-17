import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCompanyLogo } from "@/lib/companyLogo";
import TeamView from "./TeamView";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, companies ( id, company_code, status )")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner") redirect("/dashboard");

  const company = (profile as unknown as {
    companies: { id: string; company_code: string; status: string } | null;
  }).companies;
  const logoUrl = company?.id ? await getCompanyLogo(supabase, company.id) : null;

  return (
    <AppShell>
      <TeamView
        companyCode={company?.company_code ?? ""}
        companyActive={company?.status === "active"}
        initialLogoUrl={logoUrl}
      />
    </AppShell>
  );
}
