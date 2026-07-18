"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import QuoteDocument from "@/components/QuoteDocument";
import OrientationToggle, { type Orientation } from "@/components/OrientationToggle";
import type { QuoteLineItem } from "@/lib/types";
import type { QuoteFieldSettings } from "@/lib/quoteFields";

interface QuoteDraft {
  quoteNo: string;
  projectName: string;
  customerName: string;
  customerContact?: string;
  customerEmail: string;
  siteAddress?: string;
  constructionPeriod?: string;
  date: string;
  items: QuoteLineItem[];
  notes: string;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  aiGenerated: boolean;
}

interface Props {
  companyName: string;
  companyLogoUrl: string | null;
  companyPostalCode: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  invoiceRegNo: string | null;
  bankInfo: string | null;
  defaultValidityDays: string | null;
  defaultPaymentTerms: string | null;
  personInCharge: string;
  fieldSettings: QuoteFieldSettings;
}

export default function PreviewView(props: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  useEffect(() => {
    const raw = sessionStorage.getItem("quote_draft");
    if (raw) setDraft(JSON.parse(raw));
    else router.replace("/quotes/new");
  }, [router]);

  if (!draft) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("users").select("company_id").eq("id", user!.id).maybeSingle();
      if (!profile) throw new Error("会社情報が見つかりません");

      const base = {
        company_id: profile.company_id,
        owner_id: user!.id,
        quote_no: draft.quoteNo,
        project_name: draft.projectName,
        customer_name: draft.customerName,
        customer_email: draft.customerEmail || null,
        items: draft.items,
        notes: draft.notes,
        subtotal: draft.subtotal,
        discount: draft.discount,
        tax_amount: draft.taxAmount,
        total: draft.total,
        status: "未確定" as const,
        ai_generated: draft.aiGenerated,
      };
      const withExtras = {
        ...base,
        customer_contact: draft.customerContact || null,
        site_address: draft.siteAddress || null,
        construction_period: draft.constructionPeriod || null,
      };

      // Try inserting with the 0005 columns; if they don't exist yet, fall
      // back to the base columns so saving still works.
      let insertError = (await supabase.from("quotes").insert(withExtras)).error;
      if (insertError) {
        insertError = (await supabase.from("quotes").insert(base)).error;
      }
      if (insertError) throw new Error(insertError.message);

      sessionStorage.removeItem("quote_draft");
      setSaved(true);
      setTimeout(() => router.push("/quotes"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
    setSaving(false);
  };

  return (
    <div className={`print-container orient-${orientation} px-6 py-8 max-w-5xl mx-auto`}>
      <div className="no-print flex items-center justify-between mb-6 gap-3 flex-wrap">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-600 hover:underline">
          <ChevronLeft size={18} />
          戻る
        </button>
        <div className="flex gap-2 items-center">
          <OrientationToggle value={orientation} onChange={setOrientation} />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Printer size={16} />
            印刷・PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Save size={16} />
            {saved ? "保存済み" : saving ? "保存中..." : "保存(未確定として)"}
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="quote-paper bg-white rounded-2xl border border-slate-100 shadow-sm p-8 overflow-x-auto">
        <QuoteDocument
          companyName={props.companyName}
          companyLogoUrl={props.companyLogoUrl}
          companyPostalCode={props.companyPostalCode}
          companyAddress={props.companyAddress}
          companyPhone={props.companyPhone}
          companyEmail={props.companyEmail}
          invoiceRegNo={props.invoiceRegNo}
          bankInfo={props.bankInfo}
          personInCharge={props.personInCharge}
          customerName={draft.customerName}
          customerContact={draft.customerContact ?? null}
          projectName={draft.projectName}
          siteAddress={draft.siteAddress ?? null}
          constructionPeriod={draft.constructionPeriod ?? null}
          quoteNo={draft.quoteNo}
          date={draft.date}
          validityDays={props.defaultValidityDays || undefined}
          paymentMethod={props.defaultPaymentTerms || undefined}
          items={draft.items}
          discount={draft.discount}
          notes={draft.notes}
          fields={props.fieldSettings}
        />
      </div>

      <div className="no-print mt-4 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
        <p className="font-medium mb-0.5">印刷・保存について</p>
        <p className="text-xs text-blue-600">
          印刷の向き(縦/横)は上のボタンで選べます。印刷ダイアログで「背景のグラフィック」をオンにすると罫線や色がきれいに出ます。保存すると「未確定」として登録され、確定は見積詳細画面から明示的に操作します。表示する項目は「会社設定 →
          見積書詳細設定」で切り替えできます。
        </p>
      </div>
    </div>
  );
}
