import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Stage 2 (本登録): the owner fills in the company's details. On success the
// company moves to 'active', which is what unlocks invite-code issuance.
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
  if (!profile) {
    return NextResponse.json({ error: "会社情報が見つかりません。" }, { status: 404 });
  }
  if (profile.role !== "owner") {
    return NextResponse.json({ error: "本登録は社長のみ実行できます。" }, { status: 403 });
  }

  const body = await request.json();
  const { industry, employeeCount, postalCode, address, phone } = body as {
    industry?: string;
    employeeCount?: number | null;
    postalCode?: string;
    address?: string;
    phone?: string;
  };

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const { error } = await admin
    .from("companies")
    .update({
      status: "active",
      industry: industry || null,
      employee_count: employeeCount || null,
      postal_code: postalCode || null,
      address: address || null,
      phone: phone || null,
    })
    .eq("id", profile.company_id);
  if (error) {
    return NextResponse.json({ error: `本登録に失敗しました: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
