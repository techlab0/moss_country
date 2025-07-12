# MOSS COUNTRY 開発仕様書

## 技術スタック

### フロントエンド
```
フレームワーク: Next.js 15 (App Router)
言語: TypeScript 5.0+
スタイリング: Tailwind CSS 3.4+
アニメーション: CSS Transitions
アイコン: SVG Icons
```

### インフラ・デプロイ
```
ホスティング: Vercel / GitHub Pages
CDN: Vercel Edge Network
DNS: 独自ドメイン対応準備
SSL: Let's Encrypt (自動)
```

## プロジェクト構成

### ディレクトリ構造
```
moss_country/
├── src/
│   ├── app/
│   │   ├── page.tsx           # ホームページ
│   │   ├── products/
│   │   │   └── page.tsx       # 商品ページ
│   │   ├── workshop/
│   │   │   └── page.tsx       # ワークショップページ
│   │   ├── story/
│   │   │   └── page.tsx       # ストーリーページ
│   │   ├── store/
│   │   │   └── page.tsx       # 店舗情報ページ
│   │   ├── contact/
│   │   │   └── page.tsx       # お問い合わせページ
│   │   ├── layout.tsx         # ルートレイアウト
│   │   └── globals.css        # グローバルスタイル
│   ├── components/
│   │   ├── ui/               # UIコンポーネント
│   │   ├── layout/           # レイアウトコンポーネント
│   │   └── sections/         # セクションコンポーネント
│   └── lib/                  # ユーティリティ関数
├── public/
│   ├── images/               # 画像ファイル
│   └── favicon.ico           # ファビコン
├── docs/                     # プロジェクトドキュメント
├── index-tailwind.html       # HTML版（GitHub Pages用）
└── index.html                # 静的HTML版
```

## コンポーネント設計

### 設計原則
1. **単一責任の原則**: 各コンポーネントは1つの責任を持つ
2. **再利用性**: 複数の場所で使用可能な設計
3. **可読性**: 明確な命名と構造
4. **型安全性**: TypeScriptによる型定義

### 主要コンポーネント

#### UIコンポーネント
```
Button.tsx              # ボタンコンポーネント
Card.tsx               # カードコンポーネント
Container.tsx          # コンテナレイアウト
```

#### レイアウトコンポーネント
```
Header.tsx             # ヘッダー（ナビゲーション含む）
Footer.tsx             # フッター
```

#### セクションコンポーネント
```
Hero.tsx               # ヒーローセクション
ProductGrid.tsx        # 商品グリッド
WorkshopCard.tsx       # ワークショップカード
ContactForm.tsx        # お問い合わせフォーム
```

## パフォーマンス要件

### 目標指標
```
Core Web Vitals:
- LCP (Largest Contentful Paint): < 2.5秒
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

その他:
- Time to Interactive: < 3.5秒
- Speed Index: < 3.0秒
```

### 最適化手法
1. **画像最適化**
   - Next.js Image コンポーネント使用
   - WebP形式への変換
   - 適切なサイズ設定
   - 遅延読み込み

2. **コード分割**
   - 動的インポート
   - Route-based code splitting

## SEO技術要件

### メタデータ管理
```typescript
// 各ページのメタデータ例
export const metadata: Metadata = {
  title: 'ページタイトル | MOSS COUNTRY',
  description: 'ページの説明文',
  keywords: ['テラリウム', '北海道', '札幌'],
  openGraph: {
    title: 'ページタイトル',
    description: 'ページの説明文',
    images: ['/images/og-image.jpg'],
  },
};
```

## アクセシビリティ要件

### 対応基準
- **WCAG 2.1 AA準拠**
- **JIS X 8341-3:2016 準拠**

### 実装要件
1. **キーボードナビゲーション**
   - Tab順序の適切な設定
   - フォーカスの視覚的表示

2. **スクリーンリーダー対応**
   - 適切なaria属性
   - セマンティックHTML

3. **色・コントラスト**
   - 4.5:1以上のコントラスト比
   - 色以外の情報伝達手段

## デプロイ戦略

### GitHub Pages デプロイ
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

### Vercel デプロイ
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

## 環境変数
```env
# .env.local
NEXT_PUBLIC_SITE_URL=https://mosscountry.com
NEXT_PUBLIC_CONTACT_EMAIL=info@mosscountry.com
```

## 品質管理

### テスト戦略
1. **手動テスト**: 各ページの表示確認
2. **レスポンシブテスト**: モバイル・タブレット・デスクトップ
3. **アクセシビリティテスト**: スクリーンリーダー確認

### パフォーマンステスト
- Lighthouse スコア 90点以上
- PageSpeed Insights での確認

---

この技術仕様書は、MOSS COUNTRYウェブサイトの開発における技術的な指針です。