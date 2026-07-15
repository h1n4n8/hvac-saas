import AppShell from "@/components/AppShell";
import DashboardView from "./DashboardView";
import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name, company_id, companies ( name, plan_status )")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const company = (profile as unknown as { companies: { name: string; plan_status: string } | null })
    ?.companies ?? null;

  return (
    <AppShell>
      <DashboardView
        userId={user!.id}
        userName={profile?.name ?? ""}
        companyName={company?.name ?? ""}
        planStatus={company?.plan_status ?? "free"}
        quotes={(quotes as Quote[] | null) ?? []}
      />
    </AppShell>
  );
}
