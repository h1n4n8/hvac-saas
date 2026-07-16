import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomCode, inviteExpiry, INVITE_TTL_HOURS } from "@/lib/codes";

export const runtime = "nodejs";

// Issue a fresh invite code. Only a 本登録済み (active) company's owner may do
// this. Codes are unlimited-use but expire after 24h.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, companies ( company_code, status )")
    .eq("id", user.id)
    .maybeSingle();
  const company = (profile as unknown as { companies: { company_code: string; status: string } | null })?.companies;
  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "招待コードは社長のみ発行できます。" }, { status: 403 });
  }
  if (!company || company.status !== "active") {
    return NextResponse.json({ error: "本登録を完了すると招待コードを発行できます。" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const expiresAt = inviteExpiry();
  let code = "";
  let inserted = false;
  for (let attempt = 0; attempt < 6 && !inserted; attempt++) {
    code = randomCode(6);
    const { error } = await admin.from("invite_codes").insert({
      company_id: profile.company_id,
      code,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });
    if (!error) {
      inserted = true;
    } else if (!error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: `発行に失敗しました: ${error.message}` }, { status: 500 });
    }
  }
  if (!inserted) {
    return NextResponse.json({ error: "招待コードの発行に失敗しました。もう一度お試しください。" }, { status: 500 });
  }

  return NextResponse.json({
    code,
    companyCode: company.company_code,
    expiresAt: expiresAt.toISOString(),
    ttlHours: INVITE_TTL_HOURS,
  });
}
