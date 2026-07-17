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

  const { showLogoOnQuote } = (await request.json()) as { showLogoOnQuote?: boolean };
  if (typeof showLogoOnQuote !== "boolean") {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const { error } = await admin
    .from("companies")
    .update({ show_logo_on_quote: showLogoOnQuote })
    .eq("id", profile.company_id);
  if (error) {
    // Most likely the column doesn't exist yet (migration not run).
    return NextResponse.json(
      { error: "設定を保存できませんでした。管理者にデータベースの更新をご確認ください。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
