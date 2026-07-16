"use client";

import { useState } from "react";
import Link from "next/link";
import { Wrench, Eye, EyeOff, Clock } from "lucide-react";

// Employee self-registration via invite code. On success the account is saved
// as 承認待ち (pending); the owner must approve before they can log in.
export default function JoinPage() {
  const [companyCode, setCompanyCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyCode || !inviteCode || !name || !email) return setError("すべての項目を入力してください");
    if (password !== confirmPassword) return setError("パスワードが一致しません");
    if (password.length < 6) return setError("パスワードは6文字以上で入力してください");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, inviteCode, name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "登録に失敗しました");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-4">
            <Clock size={32} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">申請を受け付けました</h2>
          <p className="text-slate-500 text-sm mb-6">
            社長の承認をお待ちください。承認されると、会社コード・メール・パスワードでログインできるようになります。
          </p>
          <Link href="/login" className="text-slate-800 font-medium text-sm hover:underline">
            ログイン画面へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-800 rounded-2xl mb-3">
            <Wrench size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">従業員登録</h1>
          <p className="text-slate-500 mt-1 text-sm">会社コードと招待コードで登録します</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">会社コード</label>
                <input
                  type="text"
                  required
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base font-mono tracking-wider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">招待コード</label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base font-mono tracking-wider"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">お名前</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 佐藤次郎"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード(確認)</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
            >
              {loading ? "申請中..." : "登録を申請する"}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              すでにアカウントをお持ちの方は{" "}
              <Link href="/login" className="text-slate-800 font-medium hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
