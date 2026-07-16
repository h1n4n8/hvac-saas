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
    .select("name, role, status, company_id, companies ( name, status )")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  // Only approved members may use the app.
  if (profile.status !== "approved") redirect("/login");

  const company = (profile as unknown as { companies: { name: string; status: string } | null }).companies;
  // Owner still in 仮登録 → force them through 本登録 first.
  if (profile.role === "owner" && company?.status !== "active") redirect("/onboarding");

  return (
    <Shell companyName={company?.name ?? ""} userName={profile.name} role={profile.role as "owner" | "employee"}>
      {children}
    </Shell>
  );
}
