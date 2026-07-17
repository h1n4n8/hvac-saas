"use client";

import { useState } from "react";
import { Building2, Image as ImageIcon, Loader2, Trash2, Check } from "lucide-react";

interface CompanyForm {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  industry: string;
  employeeCount: string;
}

// Downscale an image file to a small PNG data URL so the stored logo stays
// tiny (fits comfortably in a DB text column).
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

export default function SettingsView({
  companyCode,
  initial,
  initialLogoUrl,
}: {
  companyCode: string;
  initial: CompanyForm;
  initialLogoUrl: string | null;
}) {
  const [form, setForm] = useState<CompanyForm>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");

  const set = (k: keyof CompanyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/company/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          postalCode: form.postalCode,
          address: form.address,
          phone: form.phone,
          industry: form.industry,
          employeeCount: form.employeeCount ? Number(form.employeeCount) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "保存に失敗しました");
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("通信エラーが発生しました");
    }
    setSaving(false);
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

  const field = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base";

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">会社設定</h1>

      {/* Company details */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">会社の詳細</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          ここで設定した情報は見積書に会社情報として表示されます。会社コード:{" "}
          <span className="font-mono font-medium text-slate-600">{companyCode}</span>
        </p>

        <form onSubmit={saveCompany} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">郵便番号</label>
              <input type="text" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={field} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">住所</label>
              <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">電話番号</label>
            <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">業種</label>
              <input type="text" value={form.industry} onChange={(e) => set("industry", e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">従業員数</label>
              <input
                type="number"
                min={1}
                value={form.employeeCount}
                onChange={(e) => set("employeeCount", e.target.value)}
                className={field}
              />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
          >
            {saved ? <Check size={16} /> : null}
            {saving ? "保存中..." : saved ? "保存しました" : "会社情報を保存"}
          </button>
        </form>
      </section>

      {/* Company logo */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">会社ロゴ(任意)</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          登録すると見積書の右上に表示されます。PNG / JPEG などの画像を選んでください。
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
    </div>
  );
}
