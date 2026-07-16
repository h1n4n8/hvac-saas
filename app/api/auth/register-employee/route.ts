import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Employee self-registration via an invite code. This is a PUBLIC route (no
// session yet): the applicant proves they belong by supplying a valid company
// code + a non-expired invite code. We create the auth user and a 'pending'
// profile; they cannot log in until the owner approves them.
export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { companyCode, inviteCode, name, email, password } = body as {
    companyCode?: string;
    inviteCode?: string;
    name?: string;
    email?: string;
    password?: string;
  };
  if (!companyCode || !inviteCode || !name || !email || !password) {
    return NextResponse.json({ error: "すべての項目を入力してください。" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上で入力してください。" }, { status: 400 });
  }

  // 1. Resolve the company by code (must be 本登録済み / active).
  const { data: company } = await admin
    .from("companies")
    .select("id, status")
    .eq("company_code", companyCode.trim().toUpperCase())
    .maybeSingle();
  if (!company || company.status !== "active") {
    return NextResponse.json({ error: "会社コードが正しくありません。" }, { status: 400 });
  }

  // 2. Validate the invite code: belongs to this company and not expired.
  const { data: invite } = await admin
    .from("invite_codes")
    .select("id, expires_at")
    .eq("company_id", company.id)
    .eq("code", inviteCode.trim().toUpperCase())
    .maybeSingle();
  if (!invite) {
    return NextResponse.json({ error: "招待コードが正しくありません。" }, { status: 400 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "招待コードの有効期限が切れています。社長に新しいコードの発行を依頼してください。" },
      { status: 400 }
    );
  }

  // 3. Reject duplicate email within the same company (global uniqueness is
  //    additionally enforced by Supabase Auth on user creation).
  const { data: dup } = await admin
    .from("users")
    .select("id")
    .eq("company_id", company.id)
    .ilike("email", email.trim())
    .maybeSingle();
  if (dup) {
    return NextResponse.json({ error: "このメールアドレスは既にこの会社で登録されています。" }, { status: 409 });
  }

  // 4. Create the auth user (email confirmation skipped: approval is the gate).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const msg = createError?.message ?? "";
    if (msg.toLowerCase().includes("already")) {
      return NextResponse.json({ error: "このメールアドレスは既に使われています。" }, { status: 409 });
    }
    return NextResponse.json({ error: `登録に失敗しました: ${msg || "不明なエラー"}` }, { status: 500 });
  }

  // 5. Create the pending profile.
  const { error: profileError } = await admin.from("users").insert({
    id: created.user.id,
    company_id: company.id,
    name: name.trim(),
    email: email.trim(),
    role: "employee",
    status: "pending",
  });
  if (profileError) {
    // Roll back the auth user so the applicant can retry cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `登録に失敗しました: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
