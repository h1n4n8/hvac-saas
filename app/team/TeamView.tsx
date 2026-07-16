"use client";

import { useCallback, useEffect, useState } from "react";
import { Ticket, Copy, Loader2, Check, X, UserCheck, Clock, Image as ImageIcon, Trash2 } from "lucide-react";
import type { PendingMember } from "@/lib/types";

// Read an image file and downscale it to a small PNG data URL so the stored
// logo stays tiny (fits comfortably in a DB text column).
function fileToLogoDataUrl(file: File, maxW = 260, maxH = 120): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルを読み込めませんでした"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("画像を読み込めませんでした"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("画像の変換に失敗しました"));
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch {
          reject(new Error("この画像は使用できません。別の画像でお試しください。"));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface InviteInfo {
  code: string;
  companyCode: string;
  expiresAt: string;
  ttlHours: number;
}

export default function TeamView({
  companyCode,
  companyActive,
  initialLogoUrl,
}: {
  companyCode: string;
  companyActive: boolean;
  initialLogoUrl: string | null;
}) {
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [approved, setApproved] = useState<PendingMember[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");

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

  const saveLogo = async (dataUrl: string | null) => {
    setLogoLoading(true);
    setLogoError("");
    try {
      const res = await fetch("/api/company/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) setLogoError(data.error ?? "保存に失敗しました");
      else setLogoUrl(data.logoUrl ?? null);
    } catch {
      setLogoError("通信エラーが発生しました");
    }
    setLogoLoading(false);
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("画像ファイルを選択してください。");
      return;
    }
    setLogoLoading(true);
    setLogoError("");
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      await saveLogo(dataUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "画像の処理に失敗しました");
      setLogoLoading(false);
    }
  };

  const expiresText = invite
    ? new Date(invite.expiresAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">メンバー管理</h1>

      {/* Company logo */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">会社ロゴ</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          ロゴを登録すると、見積書の右上に表示されます（任意）。PNG / JPEG などの画像を選んでください。
        </p>

        <div className="flex items-center gap-4">
          <div className="w-40 h-20 border border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="会社ロゴ" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">未登録</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
              {logoLoading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              画像を選ぶ
              <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={logoLoading} />
            </label>
            {logoUrl && (
              <button
                onClick={() => saveLogo(null)}
                disabled={logoLoading}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
                ロゴを削除
              </button>
            )}
          </div>
        </div>
        {logoError && <p className="text-sm text-red-500 mt-2">{logoError}</p>}
      </section>

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
