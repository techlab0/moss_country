# Square決済システム統合ガイド

## 概要
MOSS COUNTRY ECサイトにSquare決済システムを統合するためのガイドです。

## 事前準備

### 1. Square開発者アカウントの設定
1. [Square Developer Console](https://developer.squareup.com/apps) にアクセス
2. 新規アプリケーションを作成
3. 以下の情報を取得：
   - **Application ID** (公開用)
   - **Access Token** (秘匿情報)

### 2. 環境変数設定
`.env.local` ファイルに以下を追加：

```env
# Square Configuration
SQUARE_ENVIRONMENT="sandbox"  # 本番環境では "production"
NEXT_PUBLIC_SQUARE_APPLICATION_ID="your-square-app-id"
SQUARE_ACCESS_TOKEN="your-square-access-token"
```

**重要：** Access Tokenは秘匿情報のため、フロントエンドで使用しないでください。

## 技術実装

### 1. Square Web Payments SDK統合
- CDN経由でSquare Web Payments SDKを読み込み
- カード決済フォームをSquareコンポーネントに置き換え
- トークン化による安全な決済処理

### 2. API設計
- `/api/square/create-payment` - 決済処理API
- `/api/square/verify-payment` - 決済確認API

### 3. セキュリティ対策
- フロントエンドでのカード情報直接処理を廃止
- Squareトークンを使用した安全な決済
- HTTPS通信の強制

## ファイル構成

```
src/
├── app/
│   ├── api/
│   │   └── square/
│   │       ├── create-payment/
│   │       │   └── route.ts
│   │       └── verify-payment/
│   │           └── route.ts
│   └── payment/
│       └── credit-card/
│           └── page.tsx  # Square SDK統合
├── lib/
│   └── square.ts  # Square API設定
└── types/
    └── square.ts  # Square型定義
```

## 既存システムとの統合

### 1. 現在のフロー
1. カート → チェックアウト → 決済ページ
2. モック決済処理 → メール送信 → 完了

### 2. Square統合後のフロー
1. カート → チェックアウト → Square決済ページ
2. Square決済処理 → メール送信 → 完了

### 3. 保持する機能
- 在庫管理システム
- メール送信機能（SendGrid）
- 注文データ構造
- エラーハンドリング

## テスト計画
1. Sandbox環境でのテスト決済
2. エラーケースの確認
3. メール送信の確認
4. 在庫連携の確認

## リスク管理
- バックアップ：現在のモック実装を保持
- 段階的実装：まずSandboxで完全テスト
- フォールバック：エラー時の対応フロー

---
**更新日:** 2024年8月8日
**担当者:** Claude Code