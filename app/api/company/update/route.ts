import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Owner edits the company's details from the settings page. Does not change
// the company's registration status.
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
    return NextResponse.json({ error: "会社情報の変更は社長のみ可能です。" }, { status: 403 });
  }

  const body = await request.json();
  const { name, postalCode, address, phone, industry, employeeCount } = body as {
    name?: string;
    postalCode?: string;
    address?: string;
    phone?: string;
    industry?: string;
    employeeCount?: number | null;
  };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "会社名を入力してください。" }, { status: 400 });
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
    .update({
      name: name.trim(),
      postal_code: postalCode || null,
      address: address || null,
      phone: phone || null,
      industry: industry || null,
      employee_count: employeeCount || null,
    })
    .eq("id", profile.company_id);
  if (error) {
    return NextResponse.json({ error: `保存に失敗しました: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
