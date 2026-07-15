"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

type Step = "company" | "import" | "done";

interface ParsedQuoteItem {
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
}

interface ParseResponse {
  needsReview: boolean;
  mapping: { nameColumn: number; quantityColumn: number; unitColumn: number; priceColumn: number };
  items: ParsedQuoteItem[];
  headerPreview: string[];
  error?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("company");

  // Step 1: company basics
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [userName, setUserName] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  // Step 2: past-quote Excel import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [manualMapping, setManualMapping] = useState({ nameColumn: 0, unitColumn: 1, priceColumn: 2 });
  const [savingItems, setSavingItems] = useState(false);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError("");
    if (!companyName || !userName) {
      setCompanyError("会社名と担当者名を入力してください");
      return;
    }
    setCompanyLoading(true);
    try {
      const res = await fetch("/api/onboarding/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          industry,
          employeeCount: employeeCount ? Number(employeeCount) : null,
          userName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompanyError(data.error ?? "登録に失敗しました");
        setCompanyLoading(false);
        return;
      }
      setStep("import");
    } catch {
      setCompanyError("通信エラーが発生しました。ネットワークをご確認ください。");
    }
    setCompanyLoading(false);
  };

  const runParse = async (mappingOverride?: typeof manualMapping) => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError("");
    const body = new FormData();
    body.append("file", importFile);
    if (mappingOverride) body.append("mappingOverride", JSON.stringify(mappingOverride));

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
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setParseResult(null);
    setImportError("");
    if (file) runParse();
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
              <h1 className="text-lg font-semibold text-slate-800">会社情報の登録</h1>
              <p className="text-slate-500 text-sm mt-1">はじめに、会社の基本情報を教えてください。</p>
            </div>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
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
                  担当者名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="例: 山田太郎"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-base"
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
                {companyLoading ? "登録中..." : "次へ"}
              </button>
            </form>
          </div>
        )}

        {step === "import" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-3">
                <FileSpreadsheet size={26} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">過去の見積もりを取り込む(任意)</h2>
              <p className="text-slate-500 text-sm mt-1">
                過去の見積Excelをアップロードすると、AIが品目・単価パターンを読み取り、見積作成時のボタン候補として使えるようにします。
              </p>
            </div>

            {!parseResult && (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-10 cursor-pointer hover:border-slate-400 transition-colors">
                <Upload size={28} className="text-slate-400" />
                <span className="text-sm text-slate-500">
                  {importFile ? importFile.name : "Excelファイルを選択 (.xlsx / .xls)"}
                </span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </label>
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
                {parseResult.needsReview && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-medium mb-1">列の判定に自信が持てませんでした。どの列が何を表すか確認してください。</p>
                      <p className="text-amber-600">
                        検出された列見出し: {parseResult.headerPreview.filter(Boolean).join(" / ") || "(見出しなし)"}
                      </p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {(["nameColumn", "unitColumn", "priceColumn"] as const).map((key) => (
                          <div key={key}>
                            <label className="block text-[10px] text-amber-600 mb-0.5">
                              {key === "nameColumn" ? "品目名の列" : key === "unitColumn" ? "単位の列" : "単価の列"}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={manualMapping[key]}
                              onChange={(e) => setManualMapping((m) => ({ ...m, [key]: Number(e.target.value) }))}
                              className="w-full px-2 py-1 rounded-lg border border-amber-200 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => runParse(manualMapping)}
                        className="mt-2 text-xs font-medium text-amber-700 underline"
                      >
                        この列指定で再解析する
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    抽出された品目({parseResult.items.length}件)。取り込む項目にチェックを入れてください。
                  </p>
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
