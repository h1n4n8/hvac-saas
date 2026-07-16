import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// List the company's members for the owner's team screen: pending applicants
// (to approve/reject) plus already-approved staff. Served with the service
// role because RLS deliberately hides pending rows from normal reads.
export async function GET() {
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

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です(SUPABASE_SERVICE_ROLE_KEY 未設定)。" },
      { status: 503 }
    );
  }

  const { data: members, error } = await admin
    .from("users")
    .select("id, name, email, role, status, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending = (members ?? []).filter((m) => m.status === "pending");
  const approved = (members ?? []).filter((m) => m.status === "approved");
  return NextResponse.json({ pending, approved });
}
