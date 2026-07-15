import AppShell from "@/components/AppShell";
import QuotesListView from "./QuotesListView";
import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/types";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <QuotesListView quotes={(quotes as Quote[] | null) ?? []} />
    </AppShell>
  );
}
