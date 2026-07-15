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
    .select("companies ( name )")
    .eq("id", user!.id)
    .maybeSingle();
  const companyName = (profile as unknown as { companies: { name: string } | null })?.companies?.name ?? "";

  return (
    <AppShell>
      <PreviewView companyName={companyName} />
    </AppShell>
  );
}
