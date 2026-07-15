import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";

interface SuggestRequestBody {
  projectName: string;
  customerName?: string;
  selectedItems: { category: string; name: string; unit: string; quantity: number; unitPrice: number }[];
}

// The response is always a *draft*: the caller must let the user review and
// edit every field before it can be saved to a quote. This route never
// writes anything itself, and only ever reads quote_items for the caller's
// own company (RLS-enforced session client).
export async function POST(request: Request) {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。管理者にご確認ください。" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body: SuggestRequestBody = await request.json();
  if (!body.projectName) {
    return NextResponse.json({ error: "工事名を入力してください。" }, { status: 400 });
  }

  const { data: pastQuoteItems } = await supabase
    .from("quote_items")
    .select("category, name, unit, unit_price, usage_count")
    .order("usage_count", { ascending: false })
    .limit(100);

  const prompt = `あなたは空調・設備工事会社の見積作成を手伝うアシスタントです。
これから作成する見積の情報:
- 工事名: ${body.projectName}
- 顧客名: ${body.customerName ?? "未設定"}
- 現在選択されている品目: ${JSON.stringify(body.selectedItems)}

参考: この会社の過去の見積品目パターン(品目名・単位・単価・使用回数):
${JSON.stringify(pastQuoteItems ?? [])}

タスク:
過去の類似案件を参考に、この工事名にふさわしい追加の品目案を最大8件提案してください。
既に選択されている品目と重複するものは提案しないでください。
各提案には短い理由(reason、20文字程度)を添えてください。単価は過去データがあればそれを参考に、なければ一般的な相場を推定してください。
さらに、見積の備考欄に使えそうな一文(note)を1つ提案してください。

次のJSON形式のみで出力してください(説明文やコードブロック記法は不要です):
{
  "suggestedItems": [ { "category": string, "name": string, "unit": string, "unitPrice": number, "reason": string } ],
  "note": string
}`;

  let aiText: string;
  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    aiText = textBlock && textBlock.type === "text" ? textBlock.text : "";
  } catch (err) {
    return NextResponse.json(
      { error: `AI提案の生成に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}` },
      { status: 502 }
    );
  }

  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "AIの応答を解析できませんでした。もう一度お試しください。" },
      { status: 502 }
    );
  }
}
