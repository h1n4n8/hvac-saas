// Printable quote sheet in the traditional Japanese 御見積書 layout
// (ruled grid; portrait or landscape). Shared by the preview and the saved-
// quote detail view so both look identical. Amounts are tax-excluded to match
// the standard 設備工事 quote format (see 特記事項).
//
// Numbering is per work category (グループ): each category gets one 項目
// number and its line items are listed beneath without their own numbers.
// Items with no category are shown as their own numbered rows.
//
// Which header fields appear is controlled by `fields` (the company's quote
// field settings). A field is shown only when its toggle is on AND it has a
// value.

import type { ReactNode } from "react";
import { DEFAULT_QUOTE_FIELD_SETTINGS, type QuoteFieldSettings } from "@/lib/quoteFields";

export interface QuoteDocItem {
  description: string;
  category?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface QuoteDocumentProps {
  companyName: string;
  companyLogoUrl?: string | null;
  companyPostalCode?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  invoiceRegNo?: string | null;
  bankInfo?: string | null;
  personInCharge?: string | null;
  customerName: string;
  customerContact?: string | null;
  projectName: string;
  siteAddress?: string | null;
  constructionPeriod?: string | null;
  quoteNo: string;
  date: string; // YYYY-MM-DD
  items: QuoteDocItem[];
  discount: number;
  notes: string;
  validityDays?: string;
  paymentMethod?: string;
  fields?: QuoteFieldSettings;
}

// A few blank rows so short quotes still read as a ruled table, but kept
// small to stay dense and fit on as few pages as possible.
const MIN_ROWS = 6;

function formatDateJp(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${y}年 ${Number(m)}月 ${Number(d)}日`;
}

function qty(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

function has(v?: string | null): boolean {
  return !!v && String(v).trim() !== "";
}

interface Group {
  category: string;
  items: QuoteDocItem[];
}

function groupItems(items: QuoteDocItem[]): Group[] {
  const groups: Group[] = [];
  for (const it of items) {
    const cat = (it.category ?? "").trim();
    const last = groups[groups.length - 1];
    if (cat && last && last.category === cat) last.items.push(it);
    else groups.push({ category: cat, items: [it] });
  }
  return groups;
}

export default function QuoteDocument(props: QuoteDocumentProps) {
  const {
    companyName,
    companyLogoUrl,
    companyPostalCode,
    companyAddress,
    companyPhone,
    companyEmail,
    invoiceRegNo,
    bankInfo,
    personInCharge,
    customerName,
    customerContact,
    projectName,
    siteAddress,
    constructionPeriod,
    quoteNo,
    date,
    items,
    discount,
    notes,
    validityDays = "30",
    paymentMethod = "別途ご相談",
    fields = DEFAULT_QUOTE_FIELD_SETTINGS,
  } = props;

  const rawSubtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = rawSubtotal - discount;

  const cell = "border border-slate-500 px-2 py-1";
  const groups = groupItems(items);

  // ---- Items table rows (numbered by group) ----
  const rows: ReactNode[] = [];
  let n = 0;
  groups.forEach((g, gi) => {
    n += 1;
    if (g.category) {
      const groupTotal = g.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      rows.push(
        <tr key={`g${gi}`} className="bg-slate-50/70">
          <td className={`${cell} text-center align-top`}>{n}</td>
          <td className={`${cell} font-semibold`}>{g.category}</td>
          <td className={`${cell} text-right`} />
          <td className={`${cell} text-center`} />
          <td className={`${cell} text-right`} />
          <td className={`${cell} text-right font-semibold`}>{yen(groupTotal)}</td>
        </tr>
      );
      g.items.forEach((item, ii) => {
        rows.push(
          <tr key={`g${gi}i${ii}`}>
            <td className={`${cell} text-center`} />
            <td className={cell} style={{ paddingLeft: "1.75rem" }}>
              {item.description}
            </td>
            <td className={`${cell} text-right`}>{qty(item.quantity)}</td>
            <td className={`${cell} text-center`}>{item.unit || "式"}</td>
            <td className={`${cell} text-right`}>{yen(item.unitPrice)}</td>
            <td className={`${cell} text-right`}>{yen(item.quantity * item.unitPrice)}</td>
          </tr>
        );
      });
    } else {
      const item = g.items[0];
      rows.push(
        <tr key={`s${gi}`}>
          <td className={`${cell} text-center`}>{n}</td>
          <td className={cell}>{item.description}</td>
          <td className={`${cell} text-right`}>{qty(item.quantity)}</td>
          <td className={`${cell} text-center`}>{item.unit || "式"}</td>
          <td className={`${cell} text-right`}>{yen(item.unitPrice)}</td>
          <td className={`${cell} text-right`}>{yen(item.quantity * item.unitPrice)}</td>
        </tr>
      );
    }
  });
  if (discount > 0) {
    rows.push(
      <tr key="discount" className="text-red-600">
        <td className={`${cell} text-center`} />
        <td className={cell}>［出精値引き］</td>
        <td className={`${cell} text-right`} />
        <td className={`${cell} text-center`} />
        <td className={`${cell} text-right`} />
        <td className={`${cell} text-right`}>¥▲ {discount.toLocaleString()}</td>
      </tr>
    );
  }
  const fillerCount = Math.max(0, MIN_ROWS - rows.length);
  for (let i = 0; i < fillerCount; i++) {
    rows.push(
      <tr key={`f${i}`}>
        <td className={`${cell} text-center`}>&nbsp;</td>
        <td className={cell} />
        <td className={cell} />
        <td className={cell} />
        <td className={cell} />
        <td className={cell} />
      </tr>
    );
  }

  // ---- Conditional header fields ----
  const showAddress = fields.companyAddress !== false && (has(companyPostalCode) || has(companyAddress));
  const showPhone = fields.companyPhone !== false && has(companyPhone);
  const showEmail = fields.companyEmail !== false && has(companyEmail);
  const showInvoice = fields.invoiceRegNo !== false && has(invoiceRegNo);
  const showDate = fields.issueDate !== false && has(date);
  const showQuoteNo = fields.quoteNo !== false && has(quoteNo);
  const showCustomerContact = fields.customerContact !== false && has(customerContact);
  const showProjectName = fields.projectName !== false && has(projectName);
  const showSiteAddress = fields.siteAddress !== false && has(siteAddress);

  const infoRows: { label: string; value: string }[] = [];
  if (fields.personInCharge !== false && has(personInCharge)) infoRows.push({ label: "担当", value: personInCharge! });
  if (fields.validity !== false && has(validityDays)) infoRows.push({ label: "御見積有効期間", value: `${validityDays}日` });
  if (fields.paymentTerms !== false && has(paymentMethod)) infoRows.push({ label: "お支払い方法", value: paymentMethod! });
  if (fields.constructionPeriod !== false && has(constructionPeriod))
    infoRows.push({ label: "工期・施工予定日", value: constructionPeriod! });
  if (fields.bankInfo !== false && has(bankInfo)) infoRows.push({ label: "振込先", value: bankInfo! });

  return (
    <div className="quote-doc text-slate-900 mx-auto" style={{ maxWidth: "1000px" }}>
      {/* Title + date/No */}
      <div className="grid grid-cols-3 items-start mb-2">
        <div />
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-[0.35em]">御見積書</h1>
          <p className="text-[11px] mt-0.5">下記の通り御見積申し上げます。</p>
        </div>
        <div className="text-right text-xs leading-5">
          {showDate && <p>{formatDateJp(date)}</p>}
          {showQuoteNo && <p>No.{quoteNo}</p>}
        </div>
      </div>

      {/* Top: customer / 合計 / 工事名 (left), issuer + info box (right) */}
      <div className="flex justify-between gap-8 mb-3">
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div className="border-b-2 border-slate-800 pb-1">
            <span className="text-lg font-semibold">{customerName}　御中</span>
            {showCustomerContact && <span className="text-sm text-slate-600 ml-3">ご担当: {customerContact} 様</span>}
          </div>
          <div className="border-b-2 border-slate-800 pb-1 flex items-baseline gap-8">
            <span className="text-sm text-slate-600 flex-shrink-0">合計</span>
            <span className="text-2xl font-bold tracking-wide">{yen(total)}</span>
          </div>
          {showProjectName && (
            <div className="border-b border-slate-400 pb-1 flex items-baseline gap-8">
              <span className="text-sm text-slate-600 flex-shrink-0">工事名</span>
              <span className="text-sm">{projectName}</span>
            </div>
          )}
          {showSiteAddress && (
            <div className="border-b border-slate-400 pb-1 flex items-baseline gap-8">
              <span className="text-sm text-slate-600 flex-shrink-0">現場住所</span>
              <span className="text-sm">{siteAddress}</span>
            </div>
          )}
        </div>

        <div className="w-[42%] flex-shrink-0">
          <div className="text-right text-xs leading-5 mb-2">
            {companyLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogoUrl}
                alt="会社ロゴ"
                style={{ maxHeight: "60px", maxWidth: "220px", marginLeft: "auto", marginBottom: "6px" }}
              />
            )}
            <p className="font-bold text-sm">{companyName}</p>
            {showAddress && (
              <p>
                {has(companyPostalCode) ? `〒${companyPostalCode}　` : ""}
                {companyAddress ?? ""}
              </p>
            )}
            {showPhone && <p>TEL {companyPhone}</p>}
            {showEmail && <p>{companyEmail}</p>}
            {showInvoice && <p>登録番号: {invoiceRegNo}</p>}
          </div>
          {infoRows.length > 0 && (
            <table className="w-full text-xs border-collapse">
              <tbody>
                {infoRows.map((r) => (
                  <tr key={r.label}>
                    <td className={`${cell} bg-slate-50 w-28`}>{r.label}</td>
                    <td className={cell}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Main items grid */}
      <table className="w-full text-xs border-collapse table-fixed">
        <colgroup>
          <col style={{ width: "44px" }} />
          <col />
          <col style={{ width: "84px" }} />
          <col style={{ width: "48px" }} />
          <col style={{ width: "120px" }} />
          <col style={{ width: "130px" }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-50">
            <th className={`${cell} font-medium`}>項目</th>
            <th className={`${cell} font-medium`}>名　称</th>
            <th className={`${cell} font-medium`}>数　量</th>
            <th className={`${cell} font-medium`}>単位</th>
            <th className={`${cell} font-medium`}>単　価</th>
            <th className={`${cell} font-medium`}>金　額</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      {/* 特記事項 */}
      {notes && (
        <div className="mt-4 text-xs">
          <p className="mb-1">&lt;特記事項&gt;</p>
          <p className="whitespace-pre-wrap leading-6">{notes}</p>
        </div>
      )}
    </div>
  );
}
