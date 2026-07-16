import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, status, companies ( status )")
    .eq("id", user.id)
    .maybeSingle();

  // No profile (registration never finished) → back to login.
  if (!profile) redirect("/login");
  // Non-approved sessions shouldn't reach here (login blocks them), but guard.
  if (profile.status !== "approved") redirect("/login");

  const companyStatus = (profile as unknown as { companies: { status: string } | null }).companies?.status;
  // Owner who hasn't completed 本登録 yet → finish onboarding first.
  if (profile.role === "owner" && companyStatus !== "active") redirect("/onboarding");

  redirect("/dashboard");
}
