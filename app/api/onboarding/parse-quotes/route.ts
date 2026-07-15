import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";

// Decided-by-default column keywords. If the header row doesn't clearly
// match any of these, we still send the raw rows to the AI and mark the
// result as needing manual review instead of guessing silently.
const NAME_HINTS = ["品目", "名称", "工事内容", "項目", "内容"];
const QTY_HINTS = ["数量", "個数"];
const UNIT_HINTS = ["単位"];
const PRICE_HINTS = ["単価", "金額", "価格"];

interface ParsedItem {
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
}

function guessColumn(header: string[], hints: string[]): number {
  return header.findIndex((cell) => hints.some((hint) => (cell ?? "").toString().includes(hint)));
}

export async function POST(request: Request) {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。管理者にご確認ください。" },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません。" }, { status: 400 });
  }
  const mappingOverrideRaw = formData.get("mappingOverride");
  const mappingOverride = typeof mappingOverrideRaw === "string" ? JSON.parse(mappingOverrideRaw) : null;

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: unknown[][];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  } catch {
    return NextResponse.json(
      { error: "Excelファイルの読み込みに失敗しました。形式をご確認ください。" },
      { status: 400 }
    );
  }

  if (rows.length < 2) {
    return NextResponse.json({ error: "見積データの行が見つかりませんでした。" }, { status: 400 });
  }

  const header = rows[0].map((c) => String(c));
  const guessedMapping = {
    nameColumn: guessColumn(header, NAME_HINTS),
    quantityColumn: guessColumn(header, QTY_HINTS),
    unitColumn: guessColumn(header, UNIT_HINTS),
    priceColumn: guessColumn(header, PRICE_HINTS),
  };
  const mappingIsConfident = mappingOverride
    ? true
    : guessedMapping.nameColumn >= 0 && guessedMapping.priceColumn >= 0;

  // Cap the payload sent to the model; onboarding files are typically a
  // handful of past quotes, not a full accounting export.
  const previewRows = rows.slice(0, 200);

  const mappingInstruction = mappingOverride
    ? `列マッピングはユーザーが以下の通り確定済みです。この通りに列を解釈してください(0始まりのインデックス、-1は該当なし): ${JSON.stringify(mappingOverride)}`
    : `列マッピングの推測(0始まりのインデックス、-1は未検出): ${JSON.stringify(guessedMapping)}`;

  const prompt = `あなたは空調・設備工事会社の過去見積もりExcelを解析するアシスタントです。
以下はアップロードされたExcelの生データ(行の配列、1行目はヘッダーの可能性があります)です。

${mappingInstruction}

生データ:
${JSON.stringify(previewRows)}

タスク:
1. 実際の見積品目行を特定し、各行から「category(工事カテゴリの推定。例: 空調機据付工事/冷媒配管工事/ダクト工事/電気工事/計装工事/ドレン工事/試運転調整/経費・その他のいずれかに近いもの)」「name(品目名)」「unit(単位。不明なら"式")」「unitPrice(単価。数値、円)」を抽出してください。
2. 小計・消費税・合計などの集計行は品目として抽出しないでください。
3. 同じ品目が複数見積もりに登場する場合は1つにまとめ、直近または一般的な単価を採用してください。
4. 列の意味が推測しづらい、または数値であるべき単価列に非数値が多い場合は confidence を "low" にしてください。

次のJSON形式のみで出力してください(説明文やコードブロック記法は不要です):
{
  "confidence": "high" | "low",
  "mapping": { "nameColumn": number, "quantityColumn": number, "unitColumn": number, "priceColumn": number },
  "items": [ { "category": string, "name": string, "unit": string, "unitPrice": number } ]
}`;

  let aiText: string;
  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    aiText = textBlock && textBlock.type === "text" ? textBlock.text : "";
  } catch (err) {
    return NextResponse.json(
      { error: `AI解析に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}` },
      { status: 502 }
    );
  }

  let parsed: { confidence: "high" | "low"; mapping: typeof guessedMapping; items: ParsedItem[] };
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
  } catch {
    return NextResponse.json(
      { error: "AIの応答を解析できませんでした。もう一度お試しください。" },
      { status: 502 }
    );
  }

  const needsReview = mappingOverride
    ? parsed.items.length === 0
    : !mappingIsConfident || parsed.confidence === "low" || parsed.items.length === 0;

  return NextResponse.json({
    needsReview,
    mapping: parsed.mapping ?? guessedMapping,
    items: parsed.items ?? [],
    headerPreview: header,
    rawPreview: previewRows.slice(0, 10),
  });
}
