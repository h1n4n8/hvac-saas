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
  const { name, postalCode, address, phone, industry, employeeCount, email, bankInfo, invoiceRegNumber, defaultValidityDays, defaultPaymentTerms } =
    body as {
      name?: string;
      postalCode?: string;
      address?: string;
      phone?: string;
      industry?: string;
      employeeCount?: number | null;
      email?: string;
      bankInfo?: string;
      invoiceRegNumber?: string;
      defaultValidityDays?: string;
      defaultPaymentTerms?: string;
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

  // Core fields exist since 0002; the extras only after 0005. Try both, and on
  // failure fall back to core-only so saving still works before the migration.
  const core = {
    name: name.trim(),
    postal_code: postalCode || null,
    address: address || null,
    phone: phone || null,
    industry: industry || null,
    employee_count: employeeCount || null,
  };
  const full = {
    ...core,
    email: email || null,
    bank_info: bankInfo || null,
    invoice_reg_number: invoiceRegNumber || null,
    default_validity_days: defaultValidityDays || null,
    default_payment_terms: defaultPaymentTerms || null,
  };

  let error = (await admin.from("companies").update(full).eq("id", profile.company_id)).error;
  if (error) {
    error = (await admin.from("companies").update(core).eq("id", profile.company_id)).error;
  }
  if (error) {
    return NextResponse.json({ error: `保存に失敗しました: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
