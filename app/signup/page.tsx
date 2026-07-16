"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, Eye, EyeOff, CheckCircle2, Copy, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Stage 1 (仮登録) for the company owner. Creates the auth user, then the
// company (pending) + owner profile, and reveals the generated company code.
export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [companyCode, setCompanyCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName || !userName) return setError("会社名とお名前を入力してください");
    if (password !== confirmPassword) return setError("パスワードが一致しません");
    if (password.length < 6) return setError("パスワードは6文字以上で入力してください");

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "このメールアドレスは既に登録されています"
            : signUpError.message
        );
        setLoading(false);
        return;
      }
      if (!data.session) {
        setError(
          "メール確認が有効になっているため登録を完了できません。管理者にメール確認の無効化をご依頼ください。"
        );
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/register-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, userName }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "登録に失敗しました");
        setLoading(false);
        return;
      }
      setCompanyCode(body.companyCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(companyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stage 1 complete: show the company code, then continue to 本登録.
  if (companyCode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 size={34} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">仮登録が完了しました</h2>
          <p className="text-slate-500 text-sm mb-6">
            会社コードを発行しました。ログインや従業員の招待に必要なので、必ずメモしてください。
          </p>

          <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-5 mb-4">
            <p className="text-xs text-slate-500 font-medium mb-1">会社コード</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold text-slate-800 tracking-widest">{companyCode}</span>
              <button onClick={handleCopy} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Copy size={20} />
              </button>
            </div>
            {copied && <p className="text-xs text-green-500 mt-2">コピーしました</p>}
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6 text-left">
            ⚠️ 続いて「本登録(会社の詳細情報)」を行うと、従業員の招待ができるようになります。
          </p>

          <button
            onClick={() => {
              router.push("/onboarding");
              router.refresh();
            }}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
          >
            本登録へ進む
            <ArrowRight size={18} />
          </button>
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
          <h1 className="text-xl font-bold text-slate-800">現場らく見積</h1>
          <p className="text-slate-500 mt-1 text-sm">会社の新規登録(社長さま向け)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          <h2 className="text-base font-semibold text-slate-800 mb-1">新規登録(仮登録)</h2>
          <p className="text-xs text-slate-400 mb-5">まずは最低限の情報だけで登録できます。</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例: 山田設備工事株式会社"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                お名前(社長) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="例: 山田太郎"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                パスワード <span className="text-red-500">*</span>
              </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                パスワード(確認) <span className="text-red-500">*</span>
              </label>
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
              {loading ? "登録中..." : "仮登録する"}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-2">
            <p className="text-sm text-slate-500">
              すでにアカウントをお持ちの方は{" "}
              <Link href="/login" className="text-slate-800 font-medium hover:underline">
                ログイン
              </Link>
            </p>
            <p className="text-sm text-slate-500">
              従業員の方(招待コードをお持ちの方)は{" "}
              <Link href="/join" className="text-slate-800 font-medium hover:underline">
                こちら
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
