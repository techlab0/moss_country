# MOSS COUNTRY 画像ファイル構成

## ディレクトリ構造

```
public/images/
├── hero/           # ヒーロー・メイン画像
├── products/       # 商品画像
├── workshop/       # ワークショップ関連画像
├── story/          # ストーリー・チーム画像
├── store/          # 店舗画像
├── team/           # スタッフ・職人画像
└── og/             # OGP画像
```

## 必要な画像ファイル一覧

### ヒーロー・メイン画像
- `hero/main-hero.jpg` - メインヒーロー画像 (1920×1080px)
- `hero/products-hero.jpg` - 商品ページヒーロー (1920×600px)
- `hero/workshop-hero.jpg` - ワークショップページヒーロー (1920×600px)
- `hero/story-hero.jpg` - ストーリーページヒーロー (1920×600px)
- `hero/store-hero.jpg` - 店舗ページヒーロー (1920×600px)

### 商品画像
- `products/terrarium-starter.jpg` - ミニテラリウム スターター
- `products/terrarium-standard.jpg` - スタンダードテラリウム
- `products/terrarium-premium.jpg` - プレミアムガーデン
- `products/terrarium-luxury.jpg` - ラグジュアリーコレクション
- `products/terrarium-custom.jpg` - オーダーメイド
- `products/terrarium-gift.jpg` - ギフトセット
- `products/care-guide.jpg` - お手入れガイド画像

### ワークショップ画像
- `workshop/basic-course.jpg` - 基礎コース風景
- `workshop/advanced-course.jpg` - 応用コース風景
- `workshop/family-course.jpg` - 親子コース風景
- `workshop/premium-course.jpg` - プレミアム体験風景
- `workshop/process-1.jpg` - 制作過程1
- `workshop/process-2.jpg` - 制作過程2
- `workshop/process-3.jpg` - 制作過程3
- `workshop/finished-works.jpg` - 完成作品集

### ストーリー・チーム画像
- `story/brand-mission.jpg` - ブランドミッション画像
- `story/craftsmanship-1.jpg` - 職人技術1
- `story/craftsmanship-2.jpg` - 職人技術2
- `story/craftsmanship-3.jpg` - 職人技術3
- `team/tanaka-taro.jpg` - 田中太郎（代表）
- `team/sato-mika.jpg` - 佐藤美香（副代表）
- `team/suzuki-kenji.jpg` - 鈴木健司（講師）

### 店舗画像
- `store/exterior.jpg` - 店舗外観
- `store/showroom.jpg` - ショールーム
- `store/workshop-room.jpg` - ワークショップルーム
- `store/cafe-space.jpg` - カフェスペース
- `store/maintenance-corner.jpg` - メンテナンスコーナー

### OGP画像
- `og/og-image.jpg` - メインOG画像 (1200×630px)
- `og/products-og.jpg` - 商品ページOG画像
- `og/workshop-og.jpg` - ワークショップページOG画像
- `og/story-og.jpg` - ストーリーページOG画像
- `og/store-og.jpg` - 店舗ページOG画像

## 画像仕様

### サイズ指定
- **ヒーロー画像**: 1920×1080px または 1920×600px
- **商品画像**: 800×800px (正方形)
- **ワークショップ画像**: 800×600px
- **ポートレート**: 400×400px (正方形)
- **OG画像**: 1200×630px

### ファイル形式
- 基本: JPG (品質85-90%)
- 透明度が必要な場合: PNG
- 次世代フォーマット: WebP (Next.js Image で自動変換)

### 最適化
- ファイルサイズ: 各画像500KB以下推奨
- 色空間: sRGB
- 解像度: 72dpi (Web用)

## 代替テキスト例

```
メインヒーロー: "美しい苔テラリウムのクローズアップ写真"
商品画像: "ミニテラリウム スターター - 初心者向けの小さなカプセルテラリウム"
ワークショップ: "テラリウム制作中の参加者の手元"
職人: "MOSS COUNTRY代表 田中太郎の作業風景"
店舗: "MOSS COUNTRY札幌店の明るいショールーム"
```

## 現在の状態

現在は画像ファイルの代わりにCSS グラデーションを使用しています。
実際の画像ファイルを配置後、各コンポーネントで以下のように更新してください：

```jsx
// 現在（グラデーション）
<div className="h-48 bg-gradient-to-br from-light-green to-moss-green"></div>

// 更新後（実画像）
<Image
  src="/images/products/terrarium-starter.jpg"
  alt="ミニテラリウム スターター"
  width={800}
  height={600}
  className="w-full h-48 object-cover"
/>
```