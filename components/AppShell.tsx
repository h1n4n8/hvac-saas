import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell from "./Shell";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, company_id, companies ( name )")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const companyName = (profile as unknown as { companies: { name: string } | null }).companies?.name ?? "";

  return (
    <Shell companyName={companyName} userName={profile.name}>
      {children}
    </Shell>
  );
}
