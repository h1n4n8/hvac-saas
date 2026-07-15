import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DetailView from "./DetailView";
import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/types";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();

  if (!quote) notFound();

  return (
    <AppShell>
      <DetailView quote={quote as Quote} />
    </AppShell>
  );
}
