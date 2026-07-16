"use client";

import { useCallback, useEffect, useState } from "react";
import { Ticket, Copy, Loader2, Check, X, UserCheck, Clock } from "lucide-react";
import type { PendingMember } from "@/lib/types";

interface InviteInfo {
  code: string;
  companyCode: string;
  expiresAt: string;
  ttlHours: number;
}

export default function TeamView({
  companyCode,
  companyActive,
}: {
  companyCode: string;
  companyActive: boolean;
}) {
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [approved, setApproved] = useState<PendingMember[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copied, setCopied] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch("/api/team/pending");
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "読み込みに失敗しました");
      } else {
        setPending(data.pending ?? []);
        setApproved(data.approved ?? []);
      }
    } catch {
      setListError("通信エラーが発生しました");
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const issueInvite = async () => {
    setInviteLoading(true);
    setInviteError("");
    try {
      const res = await fetch("/api/team/invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "発行に失敗しました");
      } else {
        setInvite(data);
      }
    } catch {
      setInviteError("通信エラーが発生しました");
    }
    setInviteLoading(false);
  };

  const decide = async (userId: string, action: "approve" | "reject") => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/team/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) await loadMembers();
    } finally {
      setBusyId(null);
    }
  };

  const copyInvite = () => {
    if (!invite) return;
    navigator.clipboard.writeText(`会社コード: ${invite.companyCode}\n招待コード: ${invite.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expiresText = invite
    ? new Date(invite.expiresAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">メンバー管理</h1>

      {/* Invite code */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Ticket size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">従業員を招待する</h2>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          招待コードを発行し、従業員に「会社コード」と一緒に伝えてください。従業員は登録画面から申請し、あなたの承認後に利用できます。コードの有効期限は発行から24時間です。
        </p>
        <div className="mb-4 text-sm text-slate-600">
          あなたの会社コード:{" "}
          <span className="font-mono font-bold tracking-wider text-slate-800">{companyCode}</span>
        </div>

        {!companyActive ? (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm px-4 py-3 rounded-xl">
            本登録が完了すると招待コードを発行できます。
          </div>
        ) : (
          <>
            <button
              onClick={issueInvite}
              disabled={inviteLoading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
              招待コードを発行
            </button>
            {inviteError && <p className="text-sm text-red-500 mt-2">{inviteError}</p>}

            {invite && (
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      会社コード: <span className="font-mono font-bold text-slate-800 tracking-wider">{invite.companyCode}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      招待コード: <span className="font-mono font-bold text-slate-800 tracking-wider text-base">{invite.code}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">有効期限: {expiresText} まで</p>
                  </div>
                  <button
                    onClick={copyInvite}
                    className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-white transition-colors flex-shrink-0"
                  >
                    <Copy size={14} />
                    {copied ? "コピー済み" : "コピー"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Pending approvals */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} className="text-amber-500" />
          <h2 className="font-semibold text-slate-700">承認待ちの申請</h2>
          {pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </div>

        {loadingList ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
            <Loader2 size={16} className="animate-spin" />
            読み込み中…
          </div>
        ) : listError ? (
          <p className="text-sm text-red-500">{listError}</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">承認待ちの申請はありません。</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
                <button
                  onClick={() => decide(m.id, "approve")}
                  disabled={busyId === m.id}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors"
                >
                  <Check size={14} />
                  承認
                </button>
                <button
                  onClick={() => decide(m.id, "reject")}
                  disabled={busyId === m.id}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 transition-colors"
                >
                  <X size={14} />
                  却下
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved members */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">利用中のメンバー</h2>
        </div>
        {approved.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">まだメンバーがいません。</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {approved.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
