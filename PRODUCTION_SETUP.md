# 🚀 MOSS COUNTRY 本番環境設定ガイド

## 📋 概要

このドキュメントは、MOSS COUNTRY ECサイトを本番環境にデプロイし、安全に運用するための完全ガイドです。

## 🔧 必須環境変数設定

### 1. 基本設定
```bash
# Next.js設定
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-nextauth-key-32-chars-minimum

# サイト設定
SITE_URL=https://your-domain.com
```

### 2. 認証・セキュリティ設定
```bash
# 管理者認証
ADMIN_EMAIL=moss.country.kokenokuni@gmail.com
ADMIN_PASSWORD=ChangeThis2024!SecurePassword
ADMIN_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters

# 多要素認証（オプション）
ADMIN_2FA_ENABLED=false
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+815012345678

# Google OAuth（オプション）
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Sanity CMS設定
```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=z36tkqex
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-sanity-write-token
```

### 4. 決済システム設定 (Square)
```bash
# Square設定（本番用）
SQUARE_ENVIRONMENT=production
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your-production-app-id
SQUARE_ACCESS_TOKEN=your-production-access-token
SQUARE_LOCATION_ID=your-production-location-id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your-production-location-id
```

### 5. メール送信設定 (SendGrid)
```bash
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com
```

## 🛡️ セキュリティ設定

### 1. パスワード要件
- **最小8文字**
- **大文字・小文字・数字・特殊文字を含む**
- **定期的な変更を推奨**

### 2. JWT Secret生成
```bash
# 強力なJWT秘密鍵を生成
openssl rand -hex 32
```

### 3. HTTPS必須設定
- SSL/TLS証明書の設定
- HTTPからHTTPSへのリダイレクト
- セキュリティヘッダーの設定

## 📱 外部サービス設定

### 1. Twilio SMS設定（オプション）
1. [Twilio Console](https://console.twilio.com/)にアクセス
2. アカウント作成・電話番号取得
3. Account SID、Auth Token、電話番号を環境変数に設定

### 2. Google OAuth設定（オプション）
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. OAuth 2.0クライアントID作成
3. 承認済みリダイレクトURIに `https://your-domain.com/api/auth/callback/google` を追加
4. クライアントID・シークレットを環境変数に設定

### 3. Square決済設定
1. [Square Developer Dashboard](https://developer.squareup.com/)にアクセス
2. 本番環境アプリケーション作成
3. Production Access Token取得
4. Webhook URL設定: `https://your-domain.com/api/webhooks/square`

### 4. SendGrid設定
1. [SendGrid Console](https://sendgrid.com/)にアクセス
2. API Key作成
3. 送信者認証（SPF/DKIM）設定
4. 送信ドメインの認証

## 🚀 デプロイメント手順

### Vercel での本番デプロイ
```bash
# 1. Vercel CLI インストール
npm i -g vercel

# 2. プロジェクトにログイン
vercel login

# 3. 初回デプロイ
vercel

# 4. 本番環境設定
vercel env add ADMIN_EMAIL production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_JWT_SECRET production
# ... 他の環境変数も追加

# 5. 本番デプロイ
vercel --prod
```

### カスタムドメイン設定
```bash
# カスタムドメイン追加
vercel domains add your-domain.com
vercel domains add www.your-domain.com

# DNS設定
# A レコード: your-domain.com → 76.76.19.61
# CNAME レコード: www.your-domain.com → cname.vercel-dns.com
```

## 🔍 運用監視設定

### 1. ログ監視
- Vercel Function Logsの監視
- 監査ログの定期確認
- セキュリティアラートの即座対応

### 2. パフォーマンス監視
```bash
# Core Web Vitals監視
# - First Contentful Paint < 1.8秒
# - Largest Contentful Paint < 2.5秒
# - Cumulative Layout Shift < 0.1
```

### 3. アップタイム監視
- 外部監視サービス設定（UptimeRobot等）
- 監視URL: `https://your-domain.com/api/health`

## 🔒 セキュリティチェックリスト

### デプロイ前必須確認
- [ ] 全環境変数が本番用に設定済み
- [ ] デフォルトパスワード変更済み
- [ ] JWT秘密鍵が強力（32文字以上）
- [ ] HTTPS証明書設定済み
- [ ] Sanity Studio本番データセット使用
- [ ] Square本番環境設定済み
- [ ] SendGrid送信者認証完了

### セキュリティ設定
- [ ] 2FA有効化推奨
- [ ] 管理者アカウント最小限
- [ ] 定期的なパスワード変更
- [ ] 監査ログ定期確認
- [ ] セキュリティアップデート適用

## 📊 パフォーマンス最適化

### 1. 画像最適化
- Next.js Image最適化有効
- WebP形式自動変換
- レスポンシブ画像配信

### 2. キャッシュ戦略
- CDN活用（Vercel Edge Network）
- 静的ファイルキャッシュ
- API レスポンスキャッシュ

### 3. バンドル最適化
```bash
# バンドルサイズ分析
npm run build
npx @next/bundle-analyzer
```

## 🚨 トラブルシューティング

### よくある問題と解決法

#### 1. 認証エラー
**症状**: ログインできない
**解決法**:
- 環境変数 `ADMIN_EMAIL` と `ADMIN_PASSWORD` を確認
- JWT_SECRET が設定されているか確認

#### 2. 決済エラー
**症状**: Square決済が失敗する
**解決法**:
- Square環境設定確認（`SQUARE_ENVIRONMENT=production`）
- Location ID の正確性確認
- Webhook URL設定確認

#### 3. メール送信エラー
**症状**: メールが送信されない
**解決法**:
- SendGrid API Key確認
- 送信者認証確認
- FROM_EMAIL ドメイン認証確認

### 緊急時対応

#### サイトダウン時
1. Vercel ダッシュボードでステータス確認
2. 最新デプロイメントをロールバック
3. ログ確認・原因特定
4. 修正後再デプロイ

#### セキュリティ侵害時
1. 管理者パスワード即座変更
2. JWT秘密鍵再生成
3. 監査ログ詳細確認
4. 必要に応じてアクセス制限

## 📈 運用フロー

### 日常運用
- [ ] 監査ログ確認（日次）
- [ ] セキュリティアラート確認
- [ ] パフォーマンス指標確認
- [ ] バックアップ状況確認

### 週次運用
- [ ] ユーザー活動レポート作成
- [ ] システム稼働率レポート
- [ ] セキュリティレポート作成

### 月次運用
- [ ] パスワード強度監査
- [ ] アクセス権限見直し
- [ ] システムアップデート適用
- [ ] 災害復旧テスト

## 🆘 サポート・連絡先

### 技術サポート
- **開発者**: [開発者連絡先]
- **緊急時**: [緊急連絡先]

### 外部サービスサポート
- **Vercel**: https://vercel.com/support
- **Sanity**: https://www.sanity.io/help
- **Square**: https://squareup.com/help
- **SendGrid**: https://sendgrid.com/support

---

## ✅ デプロイメント完了チェック

本番環境へのデプロイ完了後、以下を確認してください：

### 機能確認
- [ ] トップページ正常表示
- [ ] 商品ページ正常表示
- [ ] ショッピングカート動作
- [ ] チェックアウト機能
- [ ] 決済システム動作
- [ ] 管理者ログイン
- [ ] ユーザー管理機能
- [ ] 監査ログ記録

### セキュリティ確認
- [ ] HTTPS接続確認
- [ ] 管理画面認証確認
- [ ] 2FA動作確認（有効な場合）
- [ ] セキュリティヘッダー確認

### パフォーマンス確認
- [ ] ページ読み込み速度 < 3秒
- [ ] Core Web Vitals 良好
- [ ] モバイル表示最適化

**🎉 おめでとうございます！MOSS COUNTRY が本番環境で稼働中です！**

---
*最終更新: 2025年8月26日*
*バージョン: 7.0 - 本番環境運用開始版*