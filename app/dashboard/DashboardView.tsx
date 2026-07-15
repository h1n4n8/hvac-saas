"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Users, Clock } from "lucide-react";
import type { Quote } from "@/lib/types";

const statusColor: Record<string, string> = {
  確定: "bg-green-100 text-green-700",
  未確定: "bg-amber-100 text-amber-700",
  作成中: "bg-slate-100 text-slate-600",
};

export default function DashboardView({
  userId,
  userName,
  companyName,
  planStatus,
  quotes,
}: {
  userId: string;
  userName: string;
  companyName: string;
  planStatus: string;
  quotes: Quote[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState<"mine" | "company">("mine");

  const filtered = useMemo(
    () => (scope === "mine" ? quotes.filter((q) => q.owner_id === userId) : quotes),
    [scope, quotes, userId]
  );

  const totalAmount = filtered.reduce((s, q) => s + q.total, 0);
  const unconfirmedCount = filtered.filter((q) => q.status === "未確定").length;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-slate-400 text-sm">{companyName}</p>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5">こんにちは、{userName}さん</h1>
        </div>
        {planStatus === "free" && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">
            無料プランでご利用中
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-6 mb-6">
        <button
          onClick={() => setScope("mine")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            scope === "mine" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200"
          }`}
        >
          自分の見積
        </button>
        <button
          onClick={() => setScope("company")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            scope === "company" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200"
          }`}
        >
          会社全体の見積
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-3">
            <FileText size={20} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">見積件数</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-3">
            <Clock size={20} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{unconfirmedCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">未確定見積</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm col-span-2 md:col-span-1">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mb-3">
            <Users size={20} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-slate-800">¥{totalAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">合計金額</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-700">最近の見積</h2>
          <button onClick={() => router.push("/quotes")} className="text-sm text-slate-500 hover:underline">
            すべて見る
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.slice(0, 8).map((q) => (
            <div
              key={q.id}
              onClick={() => router.push(`/quotes/${q.id}`)}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div>
                <p className="font-medium text-slate-800 text-sm">{q.project_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{q.customer_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[q.status]}`}>
                  {q.status}
                </span>
                <span className="text-sm font-semibold text-slate-700">¥{q.total.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-sm">見積がまだありません</div>
          )}
        </div>
      </div>

      <button
        onClick={() => router.push("/quotes/new")}
        className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-medium transition-colors"
      >
        <Plus size={20} />
        見積を作成
      </button>
    </div>
  );
}
