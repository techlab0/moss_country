# MOSS COUNTRY ホームページ

北海道初のカプセルテラリウム専門店のコーポレートサイト

## 🌱 プロジェクト概要

MOSS COUNTRYは札幌に拠点を置くテラリウム専門店です。職人が手作業で制作する本格的なテラリウムの販売、ワークショップの開催、オーダーメイド制作を行っています。

## 🚀 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript  
- **スタイリング**: Tailwind CSS v3.4.0
- **画像最適化**: Next.js Image Component
- **デプロイ**: Vercel (予定)

## 📁 プロジェクト構造

```
moss_country/
├── src/
│   ├── app/                 # App Router ページ
│   │   ├── page.tsx         # ホームページ
│   │   ├── products/        # 商品紹介
│   │   ├── workshop/        # ワークショップ
│   │   ├── story/           # ストーリー
│   │   ├── store/           # 店舗情報
│   │   └── contact/         # お問い合わせ
│   ├── components/          # 再利用可能コンポーネント
│   │   ├── layout/          # レイアウト関連
│   │   ├── ui/              # UIコンポーネント
│   │   └── sections/        # セクションコンポーネント
│   └── lib/                 # ユーティリティ関数
├── public/
│   └── images/              # 画像アセット
│       ├── hero/            # ヒーロー画像
│       ├── products/        # 商品画像
│       ├── workshop/        # ワークショップ画像
│       ├── story/           # ストーリー画像
│       ├── store/           # 店舗画像
│       └── team/            # チーム画像
├── docs/                    # プロジェクト設計書
└── preview.html             # 静的プレビュー
```

## 🎨 ブランドカラー

```css
moss-green: #2D5016    /* メインカラー */
light-green: #8FBC8F   /* アクセントカラー */
warm-brown: #8B4513    /* サブカラー */
beige: #F5F5DC         /* 背景カラー */
light-blue: #F0F8FF    /* セクション背景 */
```

## 🖥️ 開発環境構築

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd moss_country

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### プレビュー表示

**方法1: 開発サーバー**
```bash
npm run dev
```
http://localhost:3000 にアクセス

**方法2: 静的プレビュー**
```bash
# ブラウザでpreview.htmlを直接開く
open preview.html
```

## 📋 実装済み機能

### ✅ 完了済み
- [x] レスポンシブデザイン
- [x] 全6ページの実装
- [x] 画像管理システム
- [x] SEO最適化
- [x] アクセシビリティ対応
- [x] TypeScript型安全性
- [x] コンポーネント設計
- [x] 実画像統合

### 🔄 実装予定
- [ ] GitHub/Vercelデプロイ
- [ ] ブログ・ニュース機能
- [ ] CMS統合
- [ ] 予約システム連携
- [ ] ECサイト統合

## 📄 ページ構成

| ページ | パス | 説明 |
|--------|------|------|
| ホーム | `/` | メインランディングページ |
| 商品紹介 | `/products` | 6つの商品カテゴリ紹介 |
| ワークショップ | `/workshop` | 4つのコース・スケジュール |
| ストーリー | `/story` | ブランド・チーム紹介 |
| 店舗情報 | `/store` | アクセス・設備情報 |
| お問い合わせ | `/contact` | フォーム・FAQ |

## 🎯 SEO対策

- 各ページ個別のメタデータ
- Open Graph対応
- 日本語キーワード最適化
- 構造化データ準備
- 画像alt属性最適化

## 📱 レスポンシブ対応

- **モバイル**: 375px~
- **タブレット**: 768px~
- **デスクトップ**: 1024px~
- **大画面**: 1280px~

## 🔧 ビルド・デプロイ

```bash
# プロダクションビルド
npm run build

# ビルド結果をローカル確認
npm run start

# 型チェック・リント
npm run lint
```

## 📚 ドキュメント

詳細な設計書・仕様書は`/docs`フォルダを参照：

- `PROJECT_DESIGN_GUIDE.md` - プロジェクト総合設計
- `BRAND_GUIDELINES.md` - ブランドガイドライン  
- `CONTENT_STRATEGY.md` - コンテンツ戦略
- `DEVELOPMENT_SPECS.md` - 開発仕様書
- `USER_JOURNEY_MAP.md` - ユーザージャーニー
- `PROJECT_LOG.md` - 開発履歴ログ

## 🤝 コントリビューション

このプロジェクトはMOSS COUNTRY様専用のコーポレートサイトです。

## 📞 お問い合わせ

**MOSS COUNTRY札幌本店**
- 住所: 札幌市中央区南3条西6丁目
- 電話: 011-123-4567
- Email: info@mosscountry.com

---

**開発状況**: Phase 7完了 - プレビュー環境構築済み  
**最終更新**: 2025-07-06