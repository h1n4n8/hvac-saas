import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Creates the company + the caller's profile row in one step. Runs with the
// service role key because the caller has no company_id yet, so the normal
// company_id-scoped RLS policies can't authorize the insert. The caller's
// identity still comes from their own session (getUser()), so this can only
// ever create a profile for the signed-in user, never on someone else's
// behalf.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: existingProfile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json({ error: "会社情報は登録済みです。" }, { status: 409 });
  }

  const body = await request.json();
  const { companyName, industry, employeeCount, userName } = body as {
    companyName?: string;
    industry?: string;
    employeeCount?: number;
    userName?: string;
  };
  if (!companyName || !userName) {
    return NextResponse.json({ error: "会社名と担当者名は必須です。" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: companyName, industry: industry || null, employee_count: employeeCount || null })
    .select("id, name")
    .single();
  if (companyError || !company) {
    return NextResponse.json(
      { error: `会社の作成に失敗しました: ${companyError?.message ?? "不明なエラー"}` },
      { status: 500 }
    );
  }

  const { error: profileError } = await admin
    .from("users")
    .insert({ id: user.id, company_id: company.id, name: userName });
  if (profileError) {
    return NextResponse.json(
      { error: `プロフィールの作成に失敗しました: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ company });
}
