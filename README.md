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

### 会員登録・ログイン・権限
会社単位のアカウント管理。社長(owner)がまず会社を作り、招待コードで従業員
(employee)を追加する。
1. **仮登録** (`/signup`) — 社長が会社名・お名前・メール・パスワードで登録。
   一意な**会社コード**を自動発行し、会社は「仮登録(pending)」状態になる。
2. **本登録** (`/onboarding`) — 会社の詳細(住所・電話・業種・人数)を入力し
   会社を「本登録(active)」にする。本登録後にのみ招待コードを発行できる。
   続けて過去見積の取り込み(下記)へ。
3. **ログイン** (`/login`) — 「会社コード + メール + パスワード」の3点。会社
   コードで会社を特定し、承認済みの利用者だけがログインできる。
4. **従業員登録** (`/join`) — 会社コード + 招待コード + 名前 + メール +
   パスワード。登録は「承認待ち(pending)」で保存され、社長の承認まで
   ログイン不可。
5. **メンバー管理** (`/team`, 社長のみ) — 招待コードの発行(24時間有効・
   利用回数無制限)、承認待ち申請の承認/却下、利用中メンバーの一覧。
6. **権限** — owner: 会社情報の管理・招待発行・従業員の承認/却下。
   employee: 基本機能(見積作成・閲覧)のみ。

補足: メールは Supabase Auth の仕様上グローバルで一意。会社コードで会社を
特定したうえでメール/パスワードを検証し、会社内の一意性も担保している。
招待の検証・承認・会社作成などの特権操作はサーバー(service role)側で実行し、
業務データの読み取りは `company_id` スコープ + 承認済みのみの RLS で保護する。

### 見積・過去データ取り込み
- **過去見積の取り込み** (`/onboarding`) — 過去見積書(Excel / PDF、複数
  ファイルまとめて可)をアップロード → AIが全ファイルを横断して品目・単価
  パターンを抽出・重複統合 → 内容を確認してチェックしたものだけ取り込み。
  PDFはClaudeにそのまま渡して読み取る(ネイティブPDF対応)。
3. **見積作成** (`/quotes/new`) — 工事カテゴリ→品目はボタン選択(自社の過去
   データ + デフォルトプリセットをサジェスト)、数量・単価は数値入力、
   「AIが品目案を提案」ボタンで類似の過去パターンから追加候補を提示。
   金額に関わる内容は選択・編集した上で初めてプレビューへ進める
4. **プレビュー/保存** (`/quotes/preview`) — 印刷/PDF、保存すると「未確定」
   として登録。確定は見積詳細画面から明示的に操作する(AIの出力をそのまま
   確定させない)
5. **ダッシュボード** (`/dashboard`) — 「自分の見積」/「会社全体の見積」の
   表示切替(権限分離ではなく表示範囲の切替のみ)

### データモデル (`supabase/migrations/0002_auth_v2.sql`)
`companies`(会社コード・状態) / `users`(権限・承認状態・メール) /
`invite_codes`(24時間期限) / `quotes` / `quote_items` /
`past_quote_imports` を `company_id` スコープのRLS付きで定義。
`current_company_id()` は承認済み(approved)ユーザーのみ会社IDを返すため、
承認待ちユーザーは業務データにアクセスできない。

> **マイグレーション**: `0002_auth_v2.sql` は `0001_init.sql` を置き換える
> 最新スキーマ。既存テーブルを作り直すため、テストデータがある場合は
> Supabase の SQL Editor でこの 0002 を実行し、あわせて
> Authentication > Users の既存テストユーザーも削除すること。

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
