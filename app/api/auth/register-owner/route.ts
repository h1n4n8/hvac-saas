import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomCode } from "@/lib/codes";

export const runtime = "nodejs";

// Stage 1 (仮登録): the signed-in owner supplies just the company name and
// their own name. We create the company in 'pending' status with a freshly
// generated unique company code, and the caller's own profile as an approved
// owner. Runs with the service role key because the caller has no company_id
// yet; identity still comes from their session so it can only ever create a
// profile for themselves.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  // Already has a profile? Don't create a second company.
  const { data: existing } = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "すでに登録済みです。" }, { status: 409 });
  }

  const body = await request.json();
  const { companyName, userName } = body as { companyName?: string; userName?: string };
  if (!companyName || !userName) {
    return NextResponse.json({ error: "会社名とお名前は必須です。" }, { status: 400 });
  }

  // Generate a unique company code, retrying on the (rare) collision.
  let companyId: string | null = null;
  let companyCode = "";
  for (let attempt = 0; attempt < 6 && !companyId; attempt++) {
    companyCode = randomCode(6);
    const { data, error } = await admin
      .from("companies")
      .insert({ company_code: companyCode, name: companyName, status: "pending" })
      .select("id")
      .single();
    if (data) {
      companyId = data.id;
    } else if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { error: `会社の作成に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }
  }
  if (!companyId) {
    return NextResponse.json({ error: "会社コードの発行に失敗しました。もう一度お試しください。" }, { status: 500 });
  }

  const { error: profileError } = await admin.from("users").insert({
    id: user.id,
    company_id: companyId,
    name: userName,
    email: user.email ?? "",
    role: "owner",
    status: "approved",
  });
  if (profileError) {
    return NextResponse.json(
      { error: `プロフィールの作成に失敗しました: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ companyCode });
}
