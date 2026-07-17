import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import TeamView from "./TeamView";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, companies ( company_code, status )")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner") redirect("/dashboard");

  const company = (profile as unknown as {
    companies: { company_code: string; status: string } | null;
  }).companies;

  return (
    <AppShell>
      <TeamView companyCode={company?.company_code ?? ""} companyActive={company?.status === "active"} />
    </AppShell>
  );
}
