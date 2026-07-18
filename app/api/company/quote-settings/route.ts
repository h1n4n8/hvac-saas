import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Owner updates quote-display settings. For now: whether the company logo is
// shown on the quote sheet.
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
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "見積の設定は社長のみ変更できます。" }, { status: 403 });
  }

  const { showLogoOnQuote, fieldSettings } = (await request.json()) as {
    showLogoOnQuote?: boolean;
    fieldSettings?: Record<string, boolean>;
  };
  if (typeof showLogoOnQuote !== "boolean" && !fieldSettings) {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  // Each column may not exist yet (0004 / 0005); update them independently so a
  // missing one doesn't block the other.
  let anyError: string | null = null;
  if (typeof showLogoOnQuote === "boolean") {
    const { error } = await admin
      .from("companies")
      .update({ show_logo_on_quote: showLogoOnQuote })
      .eq("id", profile.company_id);
    if (error) anyError = error.message;
  }
  if (fieldSettings) {
    const { error } = await admin
      .from("companies")
      .update({ quote_field_settings: fieldSettings })
      .eq("id", profile.company_id);
    if (error) anyError = error.message;
  }

  if (anyError) {
    return NextResponse.json(
      { error: "設定を保存できませんでした。データベースの更新(マイグレーション)が必要な可能性があります。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
