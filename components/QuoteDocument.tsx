// Printable quote sheet in the traditional Japanese 御見積書 layout
// (ruled grid; portrait or landscape). Shared by the preview and the saved-
// quote detail view so both look identical. Amounts are tax-excluded to match
// the standard 設備工事 quote format (see 特記事項).
//
// Numbering is per work category (グループ): each category gets one 項目
// number and its line items are listed beneath without their own numbers.
// Items with no category are shown as their own numbered rows.

import type { ReactNode } from "react";

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
  personInCharge?: string | null;
  customerName: string;
  projectName: string;
  quoteNo: string;
  date: string; // YYYY-MM-DD
  items: QuoteDocItem[];
  discount: number;
  notes: string;
  validityDays?: string;
  paymentMethod?: string;
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

interface Group {
  category: string; // "" = standalone item(s), rendered as numbered rows
  items: QuoteDocItem[];
}

// Merge consecutive items that share a non-empty category into one group.
// Empty-category items each become their own single-item group.
function groupItems(items: QuoteDocItem[]): Group[] {
  const groups: Group[] = [];
  for (const it of items) {
    const cat = (it.category ?? "").trim();
    const last = groups[groups.length - 1];
    if (cat && last && last.category === cat) {
      last.items.push(it);
    } else {
      groups.push({ category: cat, items: [it] });
    }
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
    personInCharge,
    customerName,
    projectName,
    quoteNo,
    date,
    items,
    discount,
    notes,
    validityDays = "30",
    paymentMethod = "別途ご相談",
  } = props;

  const rawSubtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = rawSubtotal - discount;

  const cell = "border border-slate-500 px-2 py-1";
  const groups = groupItems(items);

  // Build the body rows, numbering by group, and count them for the filler.
  const rows: ReactNode[] = [];
  let n = 0;
  groups.forEach((g, gi) => {
    n += 1;
    if (g.category) {
      const groupTotal = g.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      // Category header row (numbered, category name, group subtotal).
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
      // Detail rows (no number, indented name).
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
      // Standalone item (no category): a single numbered row.
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
          <p>{formatDateJp(date)}</p>
          <p>No.{quoteNo}</p>
        </div>
      </div>

      {/* Top: customer / 合計 / 工事名 on the left, issuer + info box on the right */}
      <div className="flex justify-between gap-8 mb-3">
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div className="border-b-2 border-slate-800 pb-1">
            <span className="text-lg font-semibold">{customerName}　御中</span>
          </div>
          <div className="border-b-2 border-slate-800 pb-1 flex items-baseline gap-8">
            <span className="text-sm text-slate-600 flex-shrink-0">合計</span>
            <span className="text-2xl font-bold tracking-wide">{yen(total)}</span>
          </div>
          <div className="border-b border-slate-400 pb-1 flex items-baseline gap-8">
            <span className="text-sm text-slate-600 flex-shrink-0">工事名</span>
            <span className="text-sm">{projectName}</span>
          </div>
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
            {(companyPostalCode || companyAddress) && (
              <p>
                {companyPostalCode ? `〒${companyPostalCode}　` : ""}
                {companyAddress ?? ""}
              </p>
            )}
            {companyPhone && <p>TEL {companyPhone}</p>}
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className={`${cell} bg-slate-50 w-28`}>担当</td>
                <td className={cell}>{personInCharge ?? ""}</td>
              </tr>
              <tr>
                <td className={`${cell} bg-slate-50`}>御見積有効期間</td>
                <td className={cell}>{validityDays}日</td>
              </tr>
              <tr>
                <td className={`${cell} bg-slate-50`}>お支払い方法</td>
                <td className={cell}>{paymentMethod}</td>
              </tr>
            </tbody>
          </table>
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
