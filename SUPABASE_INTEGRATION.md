# 🗄️ Supabase データベース統合ガイド

## 📋 概要

MOSS COUNTRY ECサイトに Supabase データベース統合を実装しました。これにより、メモリベースのユーザー管理・監査ログから永続化されたデータベースストレージに移行できます。

## 🚀 導入手順

### 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com)にアクセス
2. 新しいプロジェクト作成
3. プロジェクトURL・APIキーを取得

### 2. データベース初期化

```bash
# 1. Supabase SQLエディターで実行
# supabase-setup.sqlの内容をコピーして実行

# 2. 初期管理者ユーザーのパスワードハッシュ生成
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('ChangeThis2024!SecurePassword', 12);
console.log('Password hash:', hash);
"

# 3. 生成されたハッシュでデフォルトユーザーを更新
UPDATE admin_users SET password_hash = '生成されたハッシュ' 
WHERE email = 'moss.country.kokenokuni@gmail.com';
```

### 3. 環境変数設定

```bash
# .env.local に追加
USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔧 実装詳細

### データベーススキーマ

#### admin_users テーブル
```sql
- id (UUID, Primary Key)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- role (VARCHAR) - 'admin' | 'editor'
- two_factor_enabled (BOOLEAN)
- totp_secret (TEXT, nullable)
- webauthn_credentials (JSONB, nullable)
- last_login (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### audit_logs テーブル
```sql
- id (UUID, Primary Key)
- user_id (VARCHAR)
- user_email (VARCHAR)
- action (VARCHAR)
- category (VARCHAR)
- details (JSONB)
- resource_id (VARCHAR, nullable)
- ip_address (VARCHAR, nullable)
- user_agent (TEXT, nullable)
- severity (VARCHAR) - 'low' | 'medium' | 'high' | 'critical'
- created_at (TIMESTAMP)
```

### ハイブリッドアーキテクチャ

システムはデータベース優先・メモリフォールバック方式で動作：

1. **データベース優先**: `USE_SUPABASE=true` の場合
   - 全ユーザー操作・監査ログをSupabaseに保存
   - 永続化されたデータで運用

2. **メモリフォールバック**: データベース接続失敗時
   - 既存のメモリベースシステムに自動切替
   - システムの可用性を保証

### API互換性

既存のコードとの完全互換性を維持：

```typescript
// 既存コード - そのまま動作
export function findUserById(id: string): AdminUser | null

// 新しいAsyncバージョンも利用可能
export async function findUserById(id: string): Promise<AdminUser | null>
```

## 🔒 セキュリティ設定

### Row Level Security (RLS)

```sql
-- 認証済みユーザーのみアクセス可能
CREATE POLICY "管理者ユーザー選択ポリシー" ON admin_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- 監査ログは挿入・選択のみ（削除・更新禁止）
CREATE POLICY "監査ログ選択ポリシー" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');
```

### データ保護

- **暗号化**: 全データはSupabase側で自動暗号化
- **バックアップ**: 自動バックアップ（Point-in-Time Recovery）
- **監査証跡**: 全操作が監査ログに記録

## 📊 監視・運用

### 統計ビュー

```sql
-- ユーザー統計
SELECT * FROM admin_users_stats;

-- 監査ログ統計
SELECT * FROM audit_logs_stats;
```

### パフォーマンス最適化

- **インデックス**: 主要カラムにインデックス設定済み
- **コネクションプール**: Supabaseクライアントの自動管理
- **キャッシュ戦略**: メモリフォールバックによる可用性向上

## 🔄 移行プロセス

### 開発環境での確認

```bash
# 1. 依存関係インストール済み確認
npm list @supabase/supabase-js

# 2. 環境変数設定確認
echo $USE_SUPABASE

# 3. データベース接続テスト
npm run dev
# 管理者ログインでデータベース接続を確認
```

### 本番環境への移行

1. **段階的移行**
   ```bash
   # Phase 1: フォールバック有効で並行運用
   USE_SUPABASE=true
   
   # Phase 2: データベースのみ運用（メモリ無効化）
   # メモリフォールバック無効化は将来のアップデートで実装
   ```

2. **データ移行**
   - 既存メモリデータのExport
   - Supabaseへのデータインポート
   - 整合性チェック

## 🛠️ トラブルシューティング

### 接続エラー

```bash
# データベース接続確認
curl -X GET "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
```

### フォールバック動作確認

```javascript
// ログで確認
console.log('データベース接続に失敗、メモリベースにフォールバック:', error)
```

### パフォーマンス監視

- Supabase Dashboard でクエリパフォーマンス監視
- ログレベルを調整してデバッグ情報取得

## 📈 コスト最適化

### 無料プランの制限

- **行数**: 500MB ストレージ
- **帯域幅**: 5GB/月
- **リアルタイム**: 200 同時接続

### 最適化戦略

1. **ログローテーション**: 古い監査ログの自動削除
2. **インデックス最適化**: 不要インデックスの削除
3. **クエリ最適化**: 効率的なクエリパターンの使用

## ✅ チェックリスト

### 導入前確認
- [ ] Supabaseプロジェクト作成完了
- [ ] データベーススキーマ実行完了
- [ ] 環境変数設定完了
- [ ] 初期ユーザー作成完了

### 導入後確認
- [ ] ログイン動作確認
- [ ] ユーザー作成動作確認
- [ ] 監査ログ記録確認
- [ ] フォールバック動作確認

---

**🎉 これでMOSS COUNTRYが本格的なデータベース統合ECサイトになりました！**

*最終更新: 2025年8月26日*
*バージョン: 7.1 - Supabase統合版*