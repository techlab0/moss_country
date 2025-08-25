# Square決済統合セットアップガイド

## 概要
MOSS COUNTRY ECサイトにSquare Payment Link方式の決済機能を統合する手順です。

## 前提条件
- Node.js 18+ 
- Next.js 15+
- Sanity CMS
- Vercel アカウント
- Square 開発者アカウント

## 1. Square開発者設定

### 1.1 Square Developerアカウント作成
1. [Square Developer Console](https://developer.squareup.com/) にアクセス
2. 新規アプリケーションを作成
3. アプリケーション名: "MOSS COUNTRY EC"

### 1.2 必要な認証情報取得
以下の情報を控えておく：

**Sandbox環境:**
- Application ID: `sq0idp-xxxxx`
- Access Token: `EAAAExxxxx`
- Location ID: `LOCATION_ID`

**本番環境:**
- Application ID: `sq0idp-xxxxx`  
- Access Token: `EAAAExxxxx`
- Location ID: `LOCATION_ID`

### 1.3 Webhook設定
1. Square Developer Console > Webhooks
2. 新しいWebhook Endpointを追加:
   - URL: `https://your-domain.vercel.app/api/webhooks/square`
   - Events: `payment.updated`, `order.updated`
3. Webhook Signature Keyを控える

## 2. 環境変数設定

### 2.1 ローカル開発環境
`.env.local` ファイルを作成/更新：

```env
# Square Configuration (Sandbox)
SQUARE_ENVIRONMENT="sandbox"
NEXT_PUBLIC_SQUARE_APPLICATION_ID="sq0idp-xxxxx"
SQUARE_ACCESS_TOKEN="EAAAExxxxx"
SQUARE_LOCATION_ID="LOCATION_ID"

# Existing Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID="z36tkqex"
NEXT_PUBLIC_SANITY_DATASET="production"

# SendGrid Configuration  
SENDGRID_API_KEY="SG.xxxxx"

# Vercel URL (自動設定されるが、開発時は手動設定)
VERCEL_URL="localhost:3000"
```

### 2.2 Vercel本番環境
Vercel Dashboard > Project Settings > Environment Variables で設定：

```env
# Square Configuration (Production)
SQUARE_ENVIRONMENT=production
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-xxxxx
SQUARE_ACCESS_TOKEN=EAAAExxxxx  
SQUARE_LOCATION_ID=LOCATION_ID

# 他の環境変数も同様に設定
NEXT_PUBLIC_SANITY_PROJECT_ID=z36tkqex
NEXT_PUBLIC_SANITY_DATASET=production
SENDGRID_API_KEY=SG.xxxxx
```

## 3. データベース設定

### 3.1 Sanity Studioでスキーマデプロイ
```bash
cd moss_country
npm run dev
```

ブラウザで `http://localhost:3000/admin` にアクセスし、新しいスキーマ（order, inventory）が表示されることを確認。

### 3.2 初期在庫データ作成
Sanity Studioで各商品に対応するInventoryドキュメントを作成：

```json
{
  "_type": "inventory",
  "product": {"_ref": "product-id"},
  "quantity": 10,
  "reserved": 0,
  "reorderLevel": 2,
  "trackingEnabled": true
}
```

## 4. 動作確認

### 4.1 開発環境でのテスト

1. **アプリケーション起動**
```bash
npm run dev
```

2. **決済フロー確認**
   - 商品をカートに追加
   - チェックアウトページへ
   - 顧客情報・配送先入力
   - 「お支払いに進む」ボタンクリック
   - Square決済ページに遷移することを確認

3. **Sandbox決済テスト**
   - テストカード番号: `4111 1111 1111 1111`
   - CVV: `111`
   - 有効期限: 未来の日付

### 4.2 Webhook動作確認

1. **ngrokでローカル露出** (ローカルテスト時)
```bash
npx ngrok http 3000
```

2. **Square WebhookエンドポイントURL更新**
   - `https://xxxxx.ngrok.io/api/webhooks/square`

3. **決済完了後の動作確認**
   - 注文ステータスが `paid` に更新される
   - 在庫が減算される  
   - 確認メールが送信される

## 5. 本番デプロイ

### 5.1 Vercelデプロイ
```bash
git add .
git commit -m "Add Square payment integration"
git push origin main
```

### 5.2 Square本番設定
1. Square Console > Applications > Production
2. 本番用認証情報をVercel環境変数に設定
3. Webhook URLを本番URLに変更

### 5.3 本番動作確認
- 少額（100円）での実決済テスト
- 決済完了フローの確認
- メール送信確認

## 6. トラブルシューティング

### 6.1 よくあるエラー

**決済リンク作成エラー**
```
Error: Failed to create payment link: Location not found
```
- `SQUARE_LOCATION_ID` の設定を確認
- Square Consoleで正しいLocation IDを取得

**Webhook受信エラー**  
```
Error: Invalid webhook signature
```
- Webhook署名検証を一時的に無効化してテスト
- Webhook Signature Keyの設定を確認

**在庫更新エラー**
```
Error: Inventory record not found
```
- 該当商品のInventoryドキュメントが作成されているか確認

### 6.2 ログ確認方法

**Vercel Functions ログ**
```bash
vercel logs --follow
```

**ローカル開発ログ**
- コンソール出力を確認
- Network タブでAPI呼び出し状況確認

### 6.3 デバッグ用エンドポイント

開発時のテスト用APIエンドポイント：
- `GET /api/payments/test` - Square接続テスト
- `POST /api/webhooks/square/test` - Webhook動作テスト

## 7. セキュリティ考慮事項

### 7.1 環境変数管理
- **絶対にコミットしない**: `.env.local`
- **本番用Access Token**: Vercel環境変数のみで管理
- **定期的なキー更新**: 3-6ヶ月ごと

### 7.2 Webhook セキュリティ
- Square署名検証を必ず有効化
- HTTPS通信の強制
- レート制限の実装

### 7.3 エラーハンドリング
- 決済失敗時の適切な処理
- 在庫不足時の注文拒否
- メール送信失敗時の代替通知

## 8. モニタリング

### 8.1 重要メトリクス
- 決済成功率
- Webhook処理時間
- 在庫同期エラー率
- メール送信成功率

### 8.2 アラート設定
- 決済失敗アラート
- Webhook遅延アラート
- 在庫切れアラート

## 9. 今後の拡張予定

### 9.1 Web Payments SDK統合
- 埋め込み型決済フォーム
- より柔軟なUI/UXカスタマイズ

### 9.2 予約システム連携
- `orders.metadata.reservationId` 活用
- ワークショップ予約との統合

### 9.3 定期購入機能
- Square Subscriptions API
- 月次/年次の苔メンテナンスサービス

---

**作成日**: 2024年8月18日  
**担当者**: Claude Code  
**バージョン**: 1.0