"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Upload, FileText, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";

type Step = "company" | "import" | "done";

interface ParsedQuoteItem {
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
}

interface ProcessedFile {
  name: string;
  ok: boolean;
  note?: string;
}

interface ParseResponse {
  needsReview: boolean;
  items: ParsedQuoteItem[];
  processedFiles: ProcessedFile[];
  error?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("company");

  // Step 1: 本登録 — company details (name & owner were set at 仮登録).
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  // Step 2: past-quote import (Excel / PDF, multiple files)
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [savingItems, setSavingItems] = useState(false);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError("");
    setCompanyLoading(true);
    try {
      const res = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          employeeCount: employeeCount ? Number(employeeCount) : null,
          postalCode,
          address,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompanyError(data.error ?? "本登録に失敗しました");
        setCompanyLoading(false);
        return;
      }
      setStep("import");
    } catch {
      setCompanyError("通信エラーが発生しました。ネットワークをご確認ください。");
    }
    setCompanyLoading(false);
  };

  const runParse = async (files: File[]) => {
    if (files.length === 0) return;
    setImportLoading(true);
    setImportError("");
    setParseResult(null);
    const body = new FormData();
    for (const f of files) body.append("files", f);

    try {
      const res = await fetch("/api/onboarding/parse-quotes", { method: "POST", body });
      const data: ParseResponse = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "解析に失敗しました");
        setImportLoading(false);
        return;
      }
      setParseResult(data);
      setSelectedItems(new Set(data.items.map((_, i) => i)));
    } catch {
      setImportError("通信エラーが発生しました。ネットワークをご確認ください。");
    }
    setImportLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    // Merge with any already-selected files, de-duplicating by name+size.
    const merged = [...importFiles];
    for (const f of picked) {
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
    }
    setImportFiles(merged);
    setParseResult(null);
    setImportError("");
    // Allow re-selecting the same file later.
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setImportFiles((prev) => prev.filter((_, i) => i !== idx));
    setParseResult(null);
  };

  const toggleItem = (i: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const finishOnboarding = async () => {
    setSavingItems(true);
    try {
      if (parseResult) {
        const chosen = parseResult.items.filter((_, i) => selectedItems.has(i));
        if (chosen.length > 0) {
          await fetch("/api/onboarding/save-quote-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: chosen }),
          });
        }
      }
    } finally {
      setStep("done");
      setSavingItems(false);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 900);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {step === "company" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-800 rounded-2xl mb-3">
                <Wrench size={26} className="text-white" />
              </div>
              <h1 className="text-lg font-semibold text-slate-800">本登録(会社の詳細情報)</h1>
              <p className="text-slate-500 text-sm mt-1">
                会社の詳細を登録すると、従業員の招待ができるようになります。見積書にも会社情報として使われます。
              </p>
            </div>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">郵便番号</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="123-4567"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">住所</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="〇〇県〇〇市…"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">電話番号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03-1234-5678"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">業種</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="空調設備工事"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">従業員数</label>
                  <input
                    type="number"
                    min={1}
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    placeholder="3"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-base"
                  />
                </div>
              </div>
              {companyError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {companyError}
                </div>
              )}
              <button
                type="submit"
                disabled={companyLoading}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
              >
                {companyLoading ? "登録中..." : "本登録して次へ"}
              </button>
            </form>
          </div>
        )}

        {step === "import" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-3">
                <FileText size={26} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">過去の見積もりを取り込む(任意)</h2>
              <p className="text-slate-500 text-sm mt-1">
                過去の見積書（ExcelまたはPDF）をアップロードすると、AIが品目・単価パターンを読み取り、見積作成時のボタン候補として使えるようにします。複数ファイルをまとめて選べます。
              </p>
            </div>

            {!parseResult && (
              <>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 cursor-pointer hover:border-slate-400 transition-colors">
                  <Upload size={26} className="text-slate-400" />
                  <span className="text-sm text-slate-500">
                    ファイルを選択（Excel / PDF、複数可）
                  </span>
                  <span className="text-xs text-slate-400">.xlsx / .xls / .pdf</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {importFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {importFiles.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                      >
                        <FileText size={15} className="text-slate-400 flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-700 truncate">{f.name}</span>
                        <button
                          onClick={() => removeFile(i)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          aria-label="削除"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => runParse(importFiles)}
                      disabled={importLoading}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                    >
                      {importFiles.length}件のファイルをAIで読み取る
                    </button>
                  </div>
                )}
              </>
            )}

            {importLoading && (
              <div className="flex items-center justify-center gap-2 text-slate-600 text-sm py-6">
                <Loader2 size={18} className="animate-spin" />
                AIが解析しています…
              </div>
            )}

            {importError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mt-3">
                {importError}
              </div>
            )}

            {parseResult && (
              <div className="mt-2 space-y-4">
                {parseResult.processedFiles && parseResult.processedFiles.length > 0 && (
                  <div className="text-xs text-slate-500 space-y-1">
                    {parseResult.processedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {f.ok ? (
                          <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{f.name}</span>
                        {f.note && <span className="text-amber-600">— {f.note}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {parseResult.needsReview && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      読み取り結果に自信が持てない部分があります。金額・品目名が正しいか確認し、必要なものだけチェックを入れて取り込んでください（あとで見積作成時にも編集できます）。
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">
                      抽出された品目({parseResult.items.length}件)。取り込む項目にチェックを入れてください。
                    </p>
                    <button
                      onClick={() => {
                        setParseResult(null);
                        setImportError("");
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline flex-shrink-0"
                    >
                      ファイルを選び直す
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                    {parseResult.items.map((item, i) => (
                      <label key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(i)}
                          onChange={() => toggleItem(i)}
                          className="rounded border-slate-300"
                        />
                        <span className="text-slate-400 text-xs w-24 flex-shrink-0">{item.category}</span>
                        <span className="flex-1 text-slate-800">{item.name}</span>
                        <span className="text-slate-500 text-xs">
                          ¥{item.unitPrice.toLocaleString()} / {item.unit}
                        </span>
                      </label>
                    ))}
                    {parseResult.items.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-6">品目を検出できませんでした</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={finishOnboarding}
              disabled={savingItems}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base mt-6"
            >
              {savingItems
                ? "保存中..."
                : parseResult
                ? `選択した${selectedItems.size}件を取り込んで完了`
                : "スキップして完了"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">設定が完了しました。ダッシュボードへ移動します…</p>
          </div>
        )}
      </div>
    </div>
  );
}
