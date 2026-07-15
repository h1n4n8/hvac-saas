"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, FileText, Plus } from "lucide-react";
import type { Quote } from "@/lib/types";

const statusColor: Record<string, string> = {
  確定: "bg-green-100 text-green-700",
  未確定: "bg-amber-100 text-amber-700",
  作成中: "bg-slate-100 text-slate-600",
};

const tabs = ["すべて", "作成中", "未確定", "確定"];

export default function QuotesListView({ quotes }: { quotes: Quote[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("すべて");
  const [search, setSearch] = useState("");

  const filtered = quotes.filter((q) => {
    const matchTab = activeTab === "すべて" || q.status === activeTab;
    const matchSearch =
      !search || q.project_name.includes(search) || q.customer_name.includes(search);
    return matchTab && matchSearch;
  });

  const total = filtered.reduce((sum, q) => sum + q.total, 0);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">見積</h1>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 rounded-xl px-4 py-2 hidden sm:block">
            <p className="text-xs text-slate-500">合計金額</p>
            <p className="text-lg font-bold text-slate-800">¥{total.toLocaleString()}</p>
          </div>
          <button
            onClick={() => router.push("/quotes/new")}
            className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            新規作成
          </button>
        </div>
      </div>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="案件名・顧客名で検索"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-sm bg-white"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">見積が見つかりませんでした</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((q) => (
              <div
                key={q.id}
                onClick={() => router.push(`/quotes/${q.id}`)}
                className="flex items-center px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                  <FileText size={18} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[q.status]}`}>
                      {q.status}
                    </span>
                    <p className="font-medium text-slate-800 text-sm truncate">{q.project_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{q.quote_no}</span>
                    <span>{q.customer_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm font-semibold text-slate-700">¥{q.total.toLocaleString()}</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
