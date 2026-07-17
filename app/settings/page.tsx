import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCompanyLogo, getShowLogoOnQuote } from "@/lib/companyLogo";
import SettingsView from "./SettingsView";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, companies ( id, name, postal_code, address, phone, industry, employee_count, company_code )")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner") redirect("/dashboard");

  const company = (profile as unknown as {
    companies: {
      id: string;
      name: string;
      postal_code: string | null;
      address: string | null;
      phone: string | null;
      industry: string | null;
      employee_count: number | null;
      company_code: string;
    } | null;
  }).companies;

  const logoUrl = company?.id ? await getCompanyLogo(supabase, company.id) : null;
  const showLogoOnQuote = company?.id ? await getShowLogoOnQuote(supabase, company.id) : true;

  return (
    <AppShell>
      <SettingsView
        companyCode={company?.company_code ?? ""}
        initial={{
          name: company?.name ?? "",
          postalCode: company?.postal_code ?? "",
          address: company?.address ?? "",
          phone: company?.phone ?? "",
          industry: company?.industry ?? "",
          employeeCount: company?.employee_count != null ? String(company.employee_count) : "",
        }}
        initialLogoUrl={logoUrl}
        initialShowLogoOnQuote={showLogoOnQuote}
      />
    </AppShell>
  );
}
