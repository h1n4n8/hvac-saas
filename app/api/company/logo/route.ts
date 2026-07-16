import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Max stored logo size (the client downscales first, so this is a safety cap).
const MAX_DATA_URL_LENGTH = 700_000; // ~500KB of image data as base64

// Owner sets or clears the company logo. `logoDataUrl` is a data: image URL,
// or null/empty to remove the logo.
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
    return NextResponse.json({ error: "会社ロゴの変更は社長のみ可能です。" }, { status: 403 });
  }

  const { logoDataUrl } = (await request.json()) as { logoDataUrl?: string | null };

  let value: string | null = null;
  if (logoDataUrl) {
    if (!/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/.test(logoDataUrl)) {
      return NextResponse.json({ error: "画像ファイルを選択してください。" }, { status: 400 });
    }
    if (logoDataUrl.length > MAX_DATA_URL_LENGTH) {
      return NextResponse.json(
        { error: "画像サイズが大きすぎます。小さめの画像でお試しください。" },
        { status: 400 }
      );
    }
    value = logoDataUrl;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const { error } = await admin.from("companies").update({ logo_url: value }).eq("id", profile.company_id);
  if (error) {
    return NextResponse.json({ error: `保存に失敗しました: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, logoUrl: value });
}
