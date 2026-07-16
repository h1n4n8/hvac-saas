"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PRESETS } from "@/lib/presets";
import { CATEGORY_NAMES, CategoryName, QuoteItemPattern } from "@/lib/types";

const FREEFORM: CategoryName | "その他（自由入力）" = "その他（自由入力）" as never;
const ALL_CATEGORIES = [...CATEGORY_NAMES, "その他（自由入力）"] as const;

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface CategoryGroup {
  id: string;
  category: (typeof ALL_CATEGORIES)[number];
  items: LineItem[];
  collapsed: boolean;
}

let _itemCounter = 0;
function newItem(description = "", unit = "式", unitPrice = 0): LineItem {
  return { id: `i${++_itemCounter}_${Date.now()}`, description, quantity: 1, unit, unitPrice };
}

const today = new Date().toISOString().slice(0, 10);

export default function QuoteForm() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState(
    "①本見積書には消費税は含まれておりません。\n②本見積書には法定福利費が含まれております。\n③その他、記述なき事項につきましては別途とさせて頂きます。"
  );
  const [discount, setDiscount] = useState(0);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [error, setError] = useState("");

  const [companyItems, setCompanyItems] = useState<QuoteItemPattern[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<
    { category: string; name: string; unit: string; unitPrice: number; reason: string }[] | null
  >(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [usedAi, setUsedAi] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("quote_items")
      .select("*")
      .order("usage_count", { ascending: false })
      .then(({ data }) => setCompanyItems((data as QuoteItemPattern[] | null) ?? []));
  }, []);

  const getPresetsForCategory = (cat: (typeof ALL_CATEGORIES)[number]) => {
    if (cat === FREEFORM) return [];
    const base = DEFAULT_PRESETS[cat as CategoryName];
    const fromCompany = companyItems
      .filter((i) => i.category === cat)
      .map((i) => ({ name: i.name, unit: i.unit, unitPrice: i.unit_price }));
    const merged = [...base];
    for (const item of fromCompany) {
      if (!merged.some((m) => m.name === item.name)) merged.push(item);
    }
    return merged;
  };

  const addCategory = (cat: (typeof ALL_CATEGORIES)[number]) => {
    setCategories((prev) => [...prev, { id: `c${Date.now()}`, category: cat, items: [newItem()], collapsed: false }]);
  };
  const removeCategory = (catId: string) => setCategories((prev) => prev.filter((c) => c.id !== catId));
  const toggleCollapse = (catId: string) =>
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, collapsed: !c.collapsed } : c)));

  const togglePreset = (catId: string, preset: { name: string; unit: string; unitPrice: number }) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        const exists = c.items.some((i) => i.description === preset.name);
        if (exists) {
          const items = c.items.filter((i) => i.description !== preset.name);
          return { ...c, items: items.length ? items : [newItem()] };
        }
        return { ...c, items: [...c.items, newItem(preset.name, preset.unit, preset.unitPrice)] };
      })
    );
  };

  const addBlankItem = (catId: string) =>
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, items: [...c.items, newItem()] } : c)));
  const removeItem = (catId: string, itemId: string) =>
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        const items = c.items.filter((i) => i.id !== itemId);
        return { ...c, items: items.length ? items : [newItem()] };
      })
    );
  const updateItem = (catId: string, itemId: string, field: keyof LineItem, value: string | number) =>
    setCategories((prev) =>
      prev.map((c) => (c.id !== catId ? c : { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) }))
    );

  const runAiSuggest = async () => {
    setAiLoading(true);
    setAiError("");
    setAiSuggestions(null);
    setAiNote(null);
    try {
      const res = await fetch("/api/quotes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          customerName,
          selectedItems: categories.flatMap((c) =>
            c.items.map((i) => ({ category: c.category, name: i.description, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice }))
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "AI提案の取得に失敗しました");
        return;
      }
      setAiSuggestions(data.suggestedItems ?? []);
      setAiSelected(new Set((data.suggestedItems ?? []).map((_: unknown, i: number) => i)));
      setAiNote(data.note ?? null);
    } catch {
      setAiError("通信エラーが発生しました。ネットワークをご確認ください。");
    }
    setAiLoading(false);
  };

  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const chosen = aiSuggestions.filter((_, i) => aiSelected.has(i));
    if (chosen.length > 0) setUsedAi(true);
    setCategories((prev) => {
      const next = [...prev];
      for (const s of chosen) {
        const existingCat = next.find((c) => c.category === (s.category as CategoryName));
        const item = newItem(s.name, s.unit, s.unitPrice);
        if (existingCat) {
          existingCat.items = [...existingCat.items, item];
        } else {
          next.push({
            id: `c${Date.now()}_${s.name}`,
            category: CATEGORY_NAMES.includes(s.category as CategoryName) ? (s.category as CategoryName) : "経費・その他",
            items: [item],
            collapsed: false,
          });
        }
      }
      return next;
    });
    setAiSuggestions(null);
  };

  const allItems = categories.flatMap((c) => c.items);
  const subtotal = allItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  // 税抜: 合計 = 小計 − 出精値引き(消費税は含めない。特記事項に明記)。
  const total = Math.max(0, subtotal - discount);

  const handlePreview = () => {
    setError("");
    if (!projectName) return setError("工事名を入力してください");
    if (!customerName) return setError("顧客名を入力してください");

    // Blank rows (e.g. the empty free-input row auto-added with each category)
    // are ignored so the user doesn't have to fill or delete them just to
    // reach the preview. Totals already ignore blanks (unit price 0). Each
    // item keeps its category so the quote document can number by group; the
    // free-input category is treated as "no category" (standalone rows).
    const filledItems = categories.flatMap((c) =>
      c.items
        .filter((i) => i.description.trim() !== "")
        .map((i) => ({
          description: i.description,
          category: c.category === "その他（自由入力）" ? "" : (c.category as string),
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
        }))
    );
    if (filledItems.length === 0) return setError("品目を1つ以上入力してください");

    const quoteNo = `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const draft = {
      quoteNo,
      projectName,
      customerName,
      customerEmail,
      date,
      items: filledItems,
      notes,
      subtotal,
      discount,
      taxAmount: 0,
      total,
      aiGenerated: usedAi,
    };
    sessionStorage.setItem("quote_draft", JSON.stringify(draft));
    router.push("/quotes/preview");
  };

  return (
    <>
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-600 mb-5 hover:underline text-sm">
          <ChevronLeft size={16} />
          戻る
        </button>
        <h1 className="text-xl font-bold text-slate-800 mb-5">見積作成</h1>

        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm">基本情報</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                工事名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="例: 〇〇マンション空調工事"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  顧客名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">顧客メール</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">見積日</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-500 outline-none text-sm"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700 text-sm">工事項目</h2>
              <div className="text-right">
                <p className="text-xs text-slate-400">小計</p>
                <p className="text-base font-bold text-slate-800">¥{subtotal.toLocaleString()}</p>
              </div>
            </div>

            <div className="mb-4">
              <button
                onClick={runAiSuggest}
                disabled={aiLoading || !projectName}
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                似た過去案件からAIが品目案を提案
              </button>
              {!projectName && <p className="text-[11px] text-slate-400 mt-1">工事名を入力すると使えます</p>}
              {aiError && <p className="text-xs text-red-500 mt-1">{aiError}</p>}

              {aiSuggestions && aiSuggestions.length > 0 && (
                <div className="mt-3 border border-blue-100 rounded-xl overflow-hidden">
                  <div className="bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    AIの提案(内容・金額は必ずご確認ください)
                  </div>
                  <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                    {aiSuggestions.map((s, i) => (
                      <label key={i} className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={aiSelected.has(i)}
                          onChange={() =>
                            setAiSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            })
                          }
                          className="rounded border-slate-300"
                        />
                        <span className="text-slate-400 w-20 flex-shrink-0 truncate">{s.category}</span>
                        <span className="flex-1 text-slate-800">{s.name}</span>
                        <span className="text-slate-400">¥{s.unitPrice.toLocaleString()}/{s.unit}</span>
                        <span className="text-blue-400 hidden sm:inline">{s.reason}</span>
                      </label>
                    ))}
                  </div>
                  <div className="p-2">
                    <button
                      onClick={applyAiSuggestions}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition-colors"
                    >
                      選択した{aiSelected.size}件を工事項目に追加(追加後も編集できます)
                    </button>
                  </div>
                </div>
              )}
              {aiNote && (
                <div className="mt-2 flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2">
                  <p className="flex-1 text-xs text-blue-700">備考案: {aiNote}</p>
                  <button
                    onClick={() => {
                      setNotes((n) => (n ? `${n}\n${aiNote}` : aiNote));
                      setAiNote(null);
                    }}
                    className="text-[11px] text-blue-600 font-medium hover:underline flex-shrink-0"
                  >
                    採用
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4">
              {categories.map((cat) => (
                <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
                    <button onClick={() => toggleCollapse(cat.id)} className="text-slate-400 hover:text-slate-600">
                      {cat.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <span className="flex-1 text-sm font-medium text-slate-700">{cat.category}</span>
                    <span className="text-xs text-slate-400 mr-1">
                      ¥{cat.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}
                    </span>
                    <button onClick={() => removeCategory(cat.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!cat.collapsed && (
                    <div className="p-3 space-y-3">
                      {getPresetsForCategory(cat.category).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {getPresetsForCategory(cat.category).map((preset) => {
                            const active = cat.items.some((i) => i.description === preset.name);
                            return (
                              <button
                                key={preset.name}
                                onClick={() => togglePreset(cat.id, preset)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  active
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                }`}
                              >
                                {active ? "✓ " : "+ "}
                                {preset.name}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="hidden sm:grid grid-cols-12 gap-1 text-xs text-slate-400 px-1">
                          <div className="col-span-5">品目名</div>
                          <div className="col-span-1 text-center">数量</div>
                          <div className="col-span-2 text-center">単位</div>
                          <div className="col-span-3 text-right">単価</div>
                          <div className="col-span-1" />
                        </div>
                        {cat.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                            <input
                              type="text"
                              value={item.description}
                              placeholder="品目名"
                              onChange={(e) => updateItem(cat.id, item.id, "description", e.target.value)}
                              className="col-span-5 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-slate-500 outline-none text-xs"
                            />
                            <input
                              type="number"
                              value={item.quantity}
                              min={1}
                              onChange={(e) => updateItem(cat.id, item.id, "quantity", Number(e.target.value))}
                              className="col-span-1 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-slate-500 outline-none text-xs text-center"
                            />
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateItem(cat.id, item.id, "unit", e.target.value)}
                              className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-slate-500 outline-none text-xs text-center"
                            />
                            <input
                              type="number"
                              value={item.unitPrice}
                              min={0}
                              onChange={(e) => updateItem(cat.id, item.id, "unitPrice", Number(e.target.value))}
                              className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-slate-500 outline-none text-xs text-right"
                            />
                            <button
                              onClick={() => removeItem(cat.id, item.id)}
                              disabled={cat.items.length === 1}
                              className="col-span-1 flex justify-center text-slate-300 hover:text-red-400 disabled:opacity-20 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addBlankItem(cat.id)} className="flex items-center gap-1 text-slate-600 text-xs hover:underline">
                        <Plus size={12} />
                        行を追加
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2">＋ 工事カテゴリを追加</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => addCategory(cat)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>出精値引き</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">- ¥</span>
                  <input
                    type="number"
                    value={discount}
                    min={0}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-28 px-2 py-1 rounded-lg border border-slate-200 focus:border-slate-500 outline-none text-sm text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t-2 border-slate-800">
                <span>合計金額(税抜)</span>
                <span>¥{total.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-400 text-right">※消費税は含みません(税抜)</p>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-2">備考</h2>
            <textarea
              value={notes}
              rows={4}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-xs resize-none text-slate-600"
            />
          </section>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <button
            onClick={handlePreview}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
          >
            プレビューへ →
          </button>
        </div>
      </div>
    </>
  );
}
