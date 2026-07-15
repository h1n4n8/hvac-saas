import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Item {
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
}

// Uses the session-scoped (RLS-enforced) client, so this can only ever
// write quote_items for the caller's own company.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "会社情報が見つかりません。" }, { status: 404 });
  }

  const { items }: { items: Item[] } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const rows = items.map((i) => ({
    company_id: profile.company_id,
    category: i.category || "経費・その他",
    name: i.name,
    unit: i.unit || "式",
    unit_price: i.unitPrice || 0,
    source: "ai_import" as const,
  }));

  const { error } = await supabase.from("quote_items").insert(rows);
  if (error) {
    return NextResponse.json({ error: `保存に失敗しました: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length });
}
