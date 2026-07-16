import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Owner approves or rejects a pending employee application. The target must
// belong to the owner's own company.
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
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }

  const { userId, action } = (await request.json()) as {
    userId?: string;
    action?: "approve" | "reject";
  };
  if (!userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  // Ensure the target is a member of the owner's company (never cross-company).
  const { data: target } = await admin
    .from("users")
    .select("id, company_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target || target.company_id !== profile.company_id) {
    return NextResponse.json({ error: "対象の従業員が見つかりません。" }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "社長のアカウントは変更できません。" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const { error } = await admin.from("users").update({ status: newStatus }).eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
