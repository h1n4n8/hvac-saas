"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Login with company code + email + password. The email/password are checked
// by Supabase Auth; we then confirm the account belongs to the given company
// code and is approved before letting them in.
export default function LoginPage() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signInData.user) {
        setError(
          (signInError?.message ?? "").includes("Invalid login")
            ? "メールアドレスまたはパスワードが違います"
            : signInError?.message ?? "ログインに失敗しました"
        );
        setLoading(false);
        return;
      }

      // Verify the company code + approval status for this account.
      const { data: profile } = await supabase
        .from("users")
        .select("status, companies ( company_code )")
        .eq("id", signInData.user.id)
        .maybeSingle();
      const code = (profile as unknown as { companies: { company_code: string } | null })?.companies?.company_code;

      if (!profile || !code) {
        await supabase.auth.signOut();
        setError("アカウント情報が見つかりません。新規登録からやり直してください。");
        setLoading(false);
        return;
      }
      if (code !== companyCode.trim().toUpperCase()) {
        await supabase.auth.signOut();
        setError("会社コードが違います。");
        setLoading(false);
        return;
      }
      if (profile.status === "pending") {
        await supabase.auth.signOut();
        setError("承認待ちです。社長の承認後にログインできます。");
        setLoading(false);
        return;
      }
      if (profile.status === "rejected") {
        await supabase.auth.signOut();
        setError("登録が却下されています。社長にご確認ください。");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-800 rounded-2xl mb-3">
            <Wrench size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">現場らく見積</h1>
          <p className="text-slate-500 mt-1 text-sm">設備工事会社向け見積作成アプリ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          <h2 className="text-base font-semibold text-slate-800 mb-5">ログイン</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">会社コード</label>
              <input
                type="text"
                required
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="例: A1B2C3"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-base font-mono tracking-widest"
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
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-2">
            <p className="text-sm text-slate-500">
              会社の新規登録(社長さま)は{" "}
              <Link href="/signup" className="text-slate-800 font-medium hover:underline">
                こちら
              </Link>
            </p>
            <p className="text-sm text-slate-500">
              招待コードをお持ちの従業員の方は{" "}
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
