"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Quote, QuoteStatus } from "@/lib/types";

const statusStyles: Record<QuoteStatus, string> = {
  確定: "bg-green-600 text-white",
  未確定: "bg-amber-500 text-white",
  作成中: "bg-slate-400 text-white",
};

const statusOptions: QuoteStatus[] = ["作成中", "未確定", "確定"];

export default function DetailView({ quote: initialQuote }: { quote: Quote }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [updating, setUpdating] = useState(false);

  const changeStatus = async (status: QuoteStatus) => {
    if (status === quote.status) return;
    if (status === "確定") {
      const confirmed = window.confirm(
        "確定すると金額が確定扱いになります。内容(品目・金額)をご確認いただけましたか？"
      );
      if (!confirmed) return;
    }
    setUpdating(true);
    const supabase = createClient();
    const { error } = await supabase.from("quotes").update({ status }).eq("id", quote.id);
    if (!error) setQuote((q) => ({ ...q, status }));
    setUpdating(false);
  };

  const rawSubtotal = quote.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-600 hover:underline">
          <ChevronLeft size={18} />
          戻る
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Printer size={16} />
            印刷・PDF
          </button>
        </div>
      </div>

      <div className="no-print flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">ステータス:</span>
        {statusOptions.map((s) => (
          <button
            key={s}
            disabled={updating}
            onClick={() => changeStatus(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              quote.status === s ? statusStyles[s] : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
        {quote.ai_generated && (
          <span className="text-[11px] text-blue-500 ml-2">AI提案を含む見積です</span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-widest">見　積　書</h1>
        </div>

        <div className="flex justify-between mb-8">
          <div>
            <p className="text-lg font-semibold text-slate-800 border-b-2 border-slate-800 pb-1 mb-1">{quote.customer_name} 御中</p>
            {quote.customer_email && <p className="text-xs text-slate-400">メール: {quote.customer_email}</p>}
          </div>
          <div className="text-right text-sm text-slate-600 space-y-1">
            <p>見積番号: <span className="font-medium">{quote.quote_no}</span></p>
            <p>見積日: <span className="font-medium">{new Date(quote.created_at).toISOString().slice(0, 10)}</span></p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-1">件名</p>
          <p className="text-lg font-semibold text-slate-800">{quote.project_name}</p>
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
            {quote.items.map((item, i) => (
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
            {quote.discount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>出精値引き</span>
                <span>- ¥{quote.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>消費税(10%)</span>
              <span>¥{quote.tax_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t-2 border-slate-800">
              <span>合計金額</span>
              <span>¥{quote.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-600 mb-1">備考</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
