"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import QuoteDocument from "@/components/QuoteDocument";
import OrientationToggle, { type Orientation } from "@/components/OrientationToggle";
import type { Quote, QuoteStatus } from "@/lib/types";

const statusStyles: Record<QuoteStatus, string> = {
  確定: "bg-green-600 text-white",
  未確定: "bg-amber-500 text-white",
  作成中: "bg-slate-400 text-white",
};

const statusOptions: QuoteStatus[] = ["作成中", "未確定", "確定"];

export default function DetailView({
  quote: initialQuote,
  companyName,
  companyPostalCode,
  companyAddress,
  companyPhone,
  personInCharge,
}: {
  quote: Quote;
  companyName: string;
  companyPostalCode: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  personInCharge: string;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [updating, setUpdating] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>("portrait");

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

  return (
    <div className={`print-container orient-${orientation} px-6 py-8 max-w-5xl mx-auto`}>
      <div className="no-print flex items-center justify-between mb-6 gap-3 flex-wrap">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-600 hover:underline">
          <ChevronLeft size={18} />
          戻る
        </button>
        <div className="flex items-center gap-2">
          <OrientationToggle value={orientation} onChange={setOrientation} />
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
        {quote.ai_generated && <span className="text-[11px] text-blue-500 ml-2">AI提案を含む見積です</span>}
      </div>

      <div className="quote-paper bg-white rounded-2xl border border-slate-100 shadow-sm p-8 overflow-x-auto">
        <QuoteDocument
          companyName={companyName}
          companyPostalCode={companyPostalCode}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          personInCharge={personInCharge}
          customerName={quote.customer_name}
          projectName={quote.project_name}
          quoteNo={quote.quote_no}
          date={new Date(quote.created_at).toISOString().slice(0, 10)}
          items={quote.items}
          discount={quote.discount}
          notes={quote.notes}
        />
      </div>
    </div>
  );
}
