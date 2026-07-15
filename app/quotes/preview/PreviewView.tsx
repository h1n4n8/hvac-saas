"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { QuoteLineItem } from "@/lib/types";

interface QuoteDraft {
  projectName: string;
  customerName: string;
  customerEmail: string;
  date: string;
  items: QuoteLineItem[];
  notes: string;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  aiGenerated: boolean;
}

export default function PreviewView({ companyName }: { companyName: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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

      const quoteNo = `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const { error: insertError } = await supabase.from("quotes").insert({
        company_id: profile.company_id,
        owner_id: user!.id,
        quote_no: quoteNo,
        project_name: draft.projectName,
        customer_name: draft.customerName,
        customer_email: draft.customerEmail || null,
        items: draft.items,
        notes: draft.notes,
        subtotal: draft.subtotal,
        discount: draft.discount,
        tax_amount: draft.taxAmount,
        total: draft.total,
        status: "未確定",
        ai_generated: draft.aiGenerated,
      });
      if (insertError) throw new Error(insertError.message);

      sessionStorage.removeItem("quote_draft");
      setSaved(true);
      setTimeout(() => router.push("/quotes"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
    setSaving(false);
  };

  const rawSubtotal = draft.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-600 hover:underline">
          <ChevronLeft size={18} />
          戻る
        </button>
        <div className="flex gap-2">
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-widest">見　積　書</h1>
        </div>

        <div className="flex justify-between mb-8">
          <div>
            <p className="text-lg font-semibold text-slate-800 border-b-2 border-slate-800 pb-1 mb-1">{draft.customerName} 御中</p>
            {draft.customerEmail && <p className="text-xs text-slate-400">メール: {draft.customerEmail}</p>}
          </div>
          <div className="text-right text-sm text-slate-600 space-y-1">
            <p>見積日: <span className="font-medium">{draft.date}</span></p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-1">件名</p>
          <p className="text-lg font-semibold text-slate-800">{draft.projectName}</p>
        </div>

        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-600">品目</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600 w-16">数量</th>
              <th className="text-center py-3 px-2 font-medium text-slate-600 w-14">単位</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600 w-28">単価</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600 w-28">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {draft.items.map((item, i) => (
              <tr key={i}>
                <td className="py-3 px-4 text-slate-800">{item.description}</td>
                <td className="py-3 px-4 text-right text-slate-600">{item.quantity}</td>
                <td className="py-3 px-2 text-center text-slate-500 text-xs">{item.unit ?? "式"}</td>
                <td className="py-3 px-4 text-right text-slate-600">¥{item.unitPrice.toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-800">
                  ¥{(item.quantity * item.unitPrice).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>小計</span>
              <span>¥{rawSubtotal.toLocaleString()}</span>
            </div>
            {draft.discount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>出精値引き</span>
                <span>- ¥{draft.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>消費税(10%)</span>
              <span>¥{draft.taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t-2 border-slate-800">
              <span>合計金額</span>
              <span>¥{draft.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {draft.notes && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-600 mb-1">備考</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{draft.notes}</p>
          </div>
        )}

        {companyName && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-right text-xs text-slate-500">
            <p className="font-medium text-slate-700 text-sm">{companyName}</p>
          </div>
        )}
      </div>

      <div className="no-print mt-4 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
        <p className="font-medium mb-0.5">保存後のステータスについて</p>
        <p className="text-xs text-blue-600">
          保存すると「未確定」として登録されます。内容を確認し、確定させる場合は見積詳細画面からステータスを変更してください。金額を伴う内容は必ずご自身で確認・編集のうえ確定してください。
        </p>
      </div>
    </div>
  );
}
