"use client";

import { useState } from "react";
import { Building2, Image as ImageIcon, Loader2, Trash2, Check, FileText } from "lucide-react";
import { QUOTE_FIELD_DEFS, type QuoteFieldSettings } from "@/lib/quoteFields";

interface CompanyForm {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  industry: string;
  employeeCount: string;
  email: string;
  bankInfo: string;
  invoiceRegNumber: string;
  defaultValidityDays: string;
  defaultPaymentTerms: string;
}

type Tab = "company" | "quote";

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
  initialShowLogoOnQuote,
  initialFieldSettings,
}: {
  companyCode: string;
  initial: CompanyForm;
  initialLogoUrl: string | null;
  initialShowLogoOnQuote: boolean;
  initialFieldSettings: QuoteFieldSettings;
}) {
  const [tab, setTab] = useState<Tab>("company");

  const [form, setForm] = useState<CompanyForm>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");

  const [showLogo, setShowLogo] = useState(initialShowLogoOnQuote);
  const [showLogoSaving, setShowLogoSaving] = useState(false);
  const [showLogoError, setShowLogoError] = useState("");

  const [fields, setFields] = useState<QuoteFieldSettings>(initialFieldSettings);
  const [fieldsError, setFieldsError] = useState("");

  const updateShowLogo = async (next: boolean) => {
    setShowLogo(next);
    setShowLogoSaving(true);
    setShowLogoError("");
    try {
      const res = await fetch("/api/company/quote-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showLogoOnQuote: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShowLogo(!next); // revert
        setShowLogoError(data.error ?? "保存に失敗しました");
      }
    } catch {
      setShowLogo(!next);
      setShowLogoError("通信エラーが発生しました");
    }
    setShowLogoSaving(false);
  };

  const toggleField = async (key: keyof QuoteFieldSettings) => {
    const next = { ...fields, [key]: !fields[key] };
    setFields(next);
    setFieldsError("");
    try {
      const res = await fetch("/api/company/quote-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldSettings: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFields((f) => ({ ...f, [key]: !f[key] })); // revert
        setFieldsError(data.error ?? "保存に失敗しました");
      }
    } catch {
      setFields((f) => ({ ...f, [key]: !f[key] }));
      setFieldsError("通信エラーが発生しました");
    }
  };

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
          email: form.email,
          bankInfo: form.bankInfo,
          invoiceRegNumber: form.invoiceRegNumber,
          defaultValidityDays: form.defaultValidityDays,
          defaultPaymentTerms: form.defaultPaymentTerms,
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
      <h1 className="text-2xl font-bold text-slate-800">設定</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("company")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "company" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Building2 size={16} />
          会社詳細設定
        </button>
        <button
          onClick={() => setTab("quote")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "quote" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <FileText size={16} />
          見積書詳細設定
        </button>
      </div>

      {/* Company details */}
      <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${tab === "company" ? "" : "hidden"}`}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">電話番号</label>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field} />
            </div>
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

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3">見積書に載せる情報</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">インボイス登録番号</label>
                <input
                  type="text"
                  value={form.invoiceRegNumber}
                  onChange={(e) => set("invoiceRegNumber", e.target.value)}
                  placeholder="例: T1234567890123"
                  className={field}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">振込先</label>
                <input
                  type="text"
                  value={form.bankInfo}
                  onChange={(e) => set("bankInfo", e.target.value)}
                  placeholder="例: 〇〇銀行 〇〇支店 普通 1234567"
                  className={field}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">見積有効期限(日数)</label>
                  <input
                    type="text"
                    value={form.defaultValidityDays}
                    onChange={(e) => set("defaultValidityDays", e.target.value)}
                    placeholder="例: 30"
                    className={field}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">支払条件</label>
                  <input
                    type="text"
                    value={form.defaultPaymentTerms}
                    onChange={(e) => set("defaultPaymentTerms", e.target.value)}
                    placeholder="例: 月末締め翌月末払い"
                    className={field}
                  />
                </div>
              </div>
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

      {/* Company logo (part of 会社詳細設定) */}
      <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${tab === "company" ? "" : "hidden"}`}>
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

      {/* 見積書詳細設定 */}
      <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${tab === "quote" ? "" : "hidden"}`}>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">見積書の表示設定</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">見積書の見た目に関する設定です。</p>

        <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
          <span className="text-sm text-slate-700">
            見積書にロゴを表示する
            <span className="block text-xs text-slate-400 mt-0.5">
              オンにすると、登録した会社ロゴが見積書の右上に表示されます。
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showLogo}
            onClick={() => updateShowLogo(!showLogo)}
            disabled={showLogoSaving}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
              showLogo ? "bg-slate-800" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                showLogo ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
        {!logoUrl && (
          <p className="text-xs text-amber-600 mt-2">
            ※ まだロゴが登録されていません。「会社詳細設定」からロゴを登録すると表示されます。
          </p>
        )}
        {showLogoError && <p className="text-sm text-red-500 mt-2">{showLogoError}</p>}

        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm mb-1">見積書に表示する項目</h3>
          <p className="text-xs text-slate-400 mb-3">
            オンにした項目だけが見積書に表示されます(入力・登録がある場合)。最初の見積書取り込み時にAIが自動で設定します。
          </p>
          <div className="divide-y divide-slate-50">
            {QUOTE_FIELD_DEFS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-4 py-2.5 cursor-pointer">
                <span className="text-sm text-slate-700">{f.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={fields[f.key]}
                  onClick={() => toggleField(f.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    fields[f.key] ? "bg-slate-800" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      fields[f.key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
          {fieldsError && <p className="text-sm text-red-500 mt-2">{fieldsError}</p>}
        </div>
      </section>
    </div>
  );
}
