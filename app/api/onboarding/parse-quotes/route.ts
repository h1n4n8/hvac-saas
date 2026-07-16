import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";

// Guard rails: onboarding uploads are a handful of past quotes, not an
// archive. Keep the request comfortably under the Anthropic API size limit.
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB of raw file data

interface ParsedItem {
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

function extNameOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
}

// Excel -> a compact text table the model can read. Only the first sheet and
// the first 200 rows are used (past quotes are small).
function excelToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  return JSON.stringify(rows.slice(0, 200));
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
  // Accept both the new multi-file field ("files") and, for safety, a single
  // legacy "file" field.
  const rawFiles = [...formData.getAll("files"), ...formData.getAll("file")];
  const files = rawFiles.filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "ファイルが選択されていません。" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `一度にアップロードできるのは${MAX_FILES}ファイルまでです。` },
      { status: 400 }
    );
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "ファイルの合計サイズが大きすぎます（合計20MBまで）。数を減らしてお試しください。" },
      { status: 400 }
    );
  }

  // Build a single Claude message that carries every file: Excel sheets as
  // text tables, PDFs as native document blocks. Claude reads them all and
  // returns one merged, de-duplicated item list.
  const content: Anthropic.ContentBlockParam[] = [];
  const processedFiles: ProcessedFile[] = [];

  content.push({
    type: "text",
    text: `あなたは空調・設備工事会社の過去見積もり（ExcelやPDF）を解析するアシスタントです。
これから、アップロードされた1つ以上の過去見積もりファイルを渡します。各ファイルは Excel をテキスト化した表、または PDF そのものです。
すべてのファイルに目を通し、見積品目を抽出してください。`,
  });

  for (const file of files) {
    const ext = extNameOf(file);
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (ext === "pdf" || file.type === "application/pdf") {
        content.push({ type: "text", text: `--- ファイル: ${file.name} (PDF) ---` });
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
        });
        processedFiles.push({ name: file.name, ok: true });
      } else if (ext === "xlsx" || ext === "xls") {
        const text = excelToText(buffer);
        content.push({
          type: "text",
          text: `--- ファイル: ${file.name} (Excel、行の配列) ---\n${text}`,
        });
        processedFiles.push({ name: file.name, ok: true });
      } else {
        processedFiles.push({ name: file.name, ok: false, note: "対応していない形式（Excel/PDFのみ）" });
      }
    } catch {
      processedFiles.push({ name: file.name, ok: false, note: "ファイルの読み込みに失敗しました" });
    }
  }

  if (!processedFiles.some((f) => f.ok)) {
    return NextResponse.json(
      {
        error: "読み取れるファイルがありませんでした（対応形式は Excel(.xlsx/.xls) と PDF です）。",
        processedFiles,
      },
      { status: 400 }
    );
  }

  content.push({
    type: "text",
    text: `タスク:
1. すべてのファイルから見積品目を特定し、各品目について「category(工事カテゴリの推定。例: 空調機据付工事/冷媒配管工事/ダクト工事/電気工事/計装工事/ドレン工事/試運転調整/経費・その他 のいずれかに近いもの)」「name(品目名)」「unit(単位。不明なら"式")」「unitPrice(単価。数値、円。税抜)」を抽出してください。
2. 小計・消費税・合計・値引きなどの集計行は品目として抽出しないでください。
3. 複数のファイル・見積もりに同じ品目が登場する場合は1つにまとめ、代表的（直近または最頻）な単価を採用してください。
4. 全体として読み取りの確信が持てない（表の意味が曖昧、単価が数値として読めない等）場合は confidence を "low" にしてください。

次のJSON形式のみで出力してください(説明文やコードブロック記法は不要):
{
  "confidence": "high" | "low",
  "items": [ { "category": string, "name": string, "unit": string, "unitPrice": number } ]
}`,
  });

  let aiText: string;
  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    aiText = textBlock && textBlock.type === "text" ? textBlock.text : "";
  } catch (err) {
    return NextResponse.json(
      { error: `AI解析に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`, processedFiles },
      { status: 502 }
    );
  }

  let parsed: { confidence: "high" | "low"; items: ParsedItem[] };
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
  } catch {
    return NextResponse.json(
      { error: "AIの応答を解析できませんでした。もう一度お試しください。", processedFiles },
      { status: 502 }
    );
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const needsReview = parsed.confidence === "low" || items.length === 0;

  return NextResponse.json({ needsReview, items, processedFiles });
}
