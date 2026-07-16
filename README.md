This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 現場らく見積 — 空調・設備工事会社向け見積作成MVP

ANDPADのような中堅〜大手向け施工管理アプリに対して、事務専任者がいない
5人以下の空調・設備工事会社に特化した業務管理SaaSのMVP。今回実装したのは
「見積もり作成」機能のみ(オンボーディング → 見積作成 → ダッシュボード)。

### 技術スタック
- **フロントエンド**: Next.js (App Router) + TypeScript + Tailwind CSS
- **バックエンド/DB**: Supabase (PostgreSQL + Auth)。`company_id` スコープの
  Row Level Security で会社ごとにデータを分離
- **AI連携**: Anthropic API (Claude) — 過去見積(Excel/PDF)の解析・パターン
  抽出、見積のたたき台提案

### 画面構成
1. **サインアップ/ログイン** (`/signup`, `/login`) — Supabase Auth(メール+パスワード)
2. **オンボーディング** (`/onboarding`) — 会社基本情報の入力 → 過去見積書
   (Excel / PDF、複数ファイルまとめて可)のアップロード → AIが全ファイルを
   横断して品目・単価パターンを抽出・重複統合 → 内容を確認してチェックした
   ものだけ取り込み。PDFはClaudeにそのまま渡して読み取る(ネイティブPDF対応)
3. **見積作成** (`/quotes/new`) — 工事カテゴリ→品目はボタン選択(自社の過去
   データ + デフォルトプリセットをサジェスト)、数量・単価は数値入力、
   「AIが品目案を提案」ボタンで類似の過去パターンから追加候補を提示。
   金額に関わる内容は選択・編集した上で初めてプレビューへ進める
4. **プレビュー/保存** (`/quotes/preview`) — 印刷/PDF、保存すると「未確定」
   として登録。確定は見積詳細画面から明示的に操作する(AIの出力をそのまま
   確定させない)
5. **ダッシュボード** (`/dashboard`) — 「自分の見積」/「会社全体の見積」の
   表示切替(権限分離ではなく表示範囲の切替のみ)

### データモデル (`supabase/migrations/0001_init.sql`)
`companies` / `users` / `quotes` / `quote_items` / `past_quote_imports` を
`company_id` スコープのRLS付きで定義。将来の `calendar_events`(カレンダー
連携)・`invoices`(請求)・`company_integrations`(会社ごとのOAuth連携)を
追加しても壊れないよう、同じ `company_id` + RLS パターンを踏襲する前提で
コメントを残している。

### セットアップ

```bash
cp .env.example .env.local
```

`.env.local` に以下を設定:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
  (Supabaseプロジェクトの Project Settings > API から取得)
- `ANTHROPIC_API_KEY`

Supabase側で `supabase/migrations/0001_init.sql` を実行(SQL Editor、または
`supabase db push`)。Auth設定でメール確認を無効化するか、確認メールのリンク
を踏んでからログインしてください。

```bash
npm install
npm run dev
```

### このセッションでの制約・前提
- 開発環境にSupabaseプロジェクト・Anthropic APIキーが用意されていなかった
  ため、実際のバックエンドに対する動作確認はできていません。両方の
  APIルート、および認証必須ページは、環境変数が未設定の場合にクラッシュ
  せず明確なエラー/リダイレクトを返すことは確認済みです(`npm run build`
  も通過)。
- 顧客管理・案件管理・カレンダー・請求などは今回のスコープ外(仕様書の
  「今回のスコープ外」に準拠)。`quotes` テーブルに顧客名・メールを直接
  保持する設計とし、別途の顧客マスタは作っていません。
- フリーミアム制御は `companies.plan_status` の簡易フラグのみ(ダッシュ
  ボードに現在のプラン表示のみ実装、課金・機能制限ロジックは未実装)。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
