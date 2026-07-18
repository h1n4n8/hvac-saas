// Single source of truth for the toggleable quote fields: their keys, labels,
// and which "side" of the data they come from. Used by the settings UI, the
// AI onboarding detection, and the quote document renderer so they all agree.

export const QUOTE_FIELD_DEFS = [
  { key: "companyAddress", label: "会社住所" },
  { key: "companyPhone", label: "電話番号" },
  { key: "companyEmail", label: "メールアドレス" },
  { key: "personInCharge", label: "担当者名" },
  { key: "customerContact", label: "顧客の担当者名" },
  { key: "projectName", label: "工事名" },
  { key: "siteAddress", label: "現場住所" },
  { key: "quoteNo", label: "見積番号" },
  { key: "issueDate", label: "発行日" },
  { key: "validity", label: "見積有効期限" },
  { key: "constructionPeriod", label: "工期・施工予定日" },
  { key: "paymentTerms", label: "支払条件" },
  { key: "bankInfo", label: "振込先" },
  { key: "invoiceRegNo", label: "インボイス登録番号" },
] as const;

export type QuoteFieldKey = (typeof QUOTE_FIELD_DEFS)[number]["key"];
export type QuoteFieldSettings = Record<QuoteFieldKey, boolean>;

export const DEFAULT_QUOTE_FIELD_SETTINGS: QuoteFieldSettings = Object.fromEntries(
  QUOTE_FIELD_DEFS.map((f) => [f.key, true])
) as QuoteFieldSettings;

// Merge stored settings over the defaults (missing keys default to true).
export function mergeFieldSettings(raw: unknown): QuoteFieldSettings {
  const out = { ...DEFAULT_QUOTE_FIELD_SETTINGS };
  if (raw && typeof raw === "object") {
    for (const f of QUOTE_FIELD_DEFS) {
      const v = (raw as Record<string, unknown>)[f.key];
      if (typeof v === "boolean") out[f.key] = v;
    }
  }
  return out;
}
