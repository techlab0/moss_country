# MOSS COUNTRY データベース最適化ガイド

## 概要

このガイドでは、MOSS COUNTRY ECサイトのSupabaseデータベースの最適化について説明します。パフォーマンス向上、メンテナンス、監視の方法を包括的に解説しています。

## 📋 目次

1. [最適化の概要](#最適化の概要)
2. [実装済み機能](#実装済み機能)
3. [インデックス戦略](#インデックス戦略)
4. [パフォーマンス監視](#パフォーマンス監視)
5. [メンテナンス手順](#メンテナンス手順)
6. [セキュリティ対策](#セキュリティ対策)
7. [トラブルシューティング](#トラブルシューティング)
8. [運用推奨事項](#運用推奨事項)

## 最適化の概要

### 🎯 目的
- **パフォーマンス向上**: クエリ実行時間の短縮
- **リソース効率化**: ストレージとメモリの最適利用
- **可用性確保**: 安定したサービス提供
- **セキュリティ強化**: データ整合性とアクセス制御

### 📊 対象テーブル
- `admin_users`: 管理者ユーザー情報
- `audit_logs`: 監査ログ（大容量テーブル）

## 実装済み機能

### 🗄️ データベース構造最適化

#### テーブル設計
```sql
-- 管理者ユーザーテーブル
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  -- その他のフィールド...
);

-- 監査ログテーブル（大容量対応）
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  -- その他のフィールド...
);
```

### 📈 パフォーマンスインデックス

#### 基本インデックス
- `idx_admin_users_email`: ログイン認証用
- `idx_admin_users_role`: 権限チェック用
- `idx_audit_logs_created_at`: 時系列検索用

#### 複合インデックス
- `idx_admin_users_role_created_at`: 役割別の作成日時順ソート
- `idx_audit_logs_user_action`: ユーザー別アクション検索
- `idx_audit_logs_severity_date`: 重要度別の時系列検索

#### 特殊インデックス
- `idx_audit_logs_details_gin`: JSON詳細検索用（GINインデックス）
- `idx_admin_users_active_2fa`: 2FA有効ユーザー用（部分インデックス）

### 🔧 管理画面機能

#### 1. データベース概要ダッシュボード
- **リアルタイム統計**: テーブル数、行数、サイズ
- **パフォーマンス指標**: キャッシュヒット率、接続数
- **健全性ステータス**: 正常/注意/要対応

#### 2. パフォーマンス分析
- **テーブル統計**: 各テーブルのサイズと行数
- **インデックス使用状況**: スキャン回数と効率性
- **スロークエリ検出**: パフォーマンス問題の特定

#### 3. 自動メンテナンス
- **統計情報更新**: クエリプランナーの最適化
- **古いデータクリーンアップ**: 90日以上古いログの削除
- **インデックス健全性チェック**: 使用状況の分析

#### 4. クエリ分析ツール
- **実行計画分析**: EXPLAIN結果の可視化
- **コスト分析**: クエリの実行コスト計算
- **最適化推奨**: インデックス追加等の提案

## インデックス戦略

### 📊 インデックス分類

#### 1. 主キー・ユニークインデックス
```sql
-- 自動作成（PRIMARY KEY, UNIQUE制約）
PRIMARY KEY (id)
UNIQUE (email)
```

#### 2. 検索インデックス
```sql
-- 頻繁に検索される列
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### 3. 複合インデックス
```sql
-- 複数条件での検索
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_severity_date ON audit_logs(severity, created_at DESC);
```

#### 4. 部分インデックス
```sql
-- 条件付きデータのみ
CREATE INDEX idx_admin_users_active_2fa ON admin_users(id) 
WHERE two_factor_enabled = true;

CREATE INDEX idx_audit_logs_critical ON audit_logs(created_at DESC) 
WHERE severity IN ('critical', 'high');
```

#### 5. 関数インデックス・GINインデックス
```sql
-- JSON検索用
CREATE INDEX idx_audit_logs_details_gin ON audit_logs USING gin(details);

-- テキスト検索用
CREATE INDEX idx_audit_logs_user_email_gin ON audit_logs 
USING gin(to_tsvector('japanese', user_email));
```

### ⚖️ インデックス選択基準

#### 作成すべきインデックス
- WHERE句で頻繁に使用される列
- JOIN条件で使用される列
- ORDER BY句で使用される列
- GROUP BY句で使用される列

#### 避けるべきインデックス
- 更新頻度の非常に高い列
- カーディナリティ（一意性）が低い列
- 使用頻度の低いクエリ用

## パフォーマンス監視

### 📊 監視指標

#### 1. データベース全体
- **キャッシュヒット率**: 90%以上を維持
- **アクティブ接続数**: 同時接続数の監視
- **データベースサイズ**: ストレージ使用量

#### 2. テーブルレベル
- **テーブルサイズ**: 定期的なサイズ監視
- **インデックスサイズ**: インデックス効率の確認
- **シーケンシャルスキャン**: 全表スキャンの検出

#### 3. クエリレベル
- **実行時間**: スロークエリの特定
- **実行頻度**: よく使用されるクエリの把握
- **実行計画**: インデックス使用状況

### 🚨 アラート設定

#### 警告レベル
- キャッシュヒット率が85%を下回る
- テーブルサイズが予想を大幅に上回る
- 使用されないインデックスの存在

#### 重要レベル
- データベース接続エラー
- 管理者ユーザーが0人
- 監査ログの異常な増加

### 📈 パフォーマンステスト

#### 負荷テスト用データ作成
```sql
-- テスト用ダミーデータ（開発環境でのみ実行）
SELECT create_test_audit_data(50000);
```

## メンテナンス手順

### 🔄 定期メンテナンス（自動）

#### 毎日実行
- 統計情報の更新（ANALYZE）
- キャッシュヒット率の確認

#### 週次実行
- インデックス使用状況の分析
- 古いログのクリーンアップ

#### 月次実行
- データベース健全性チェック
- 未使用インデックスの確認

### 🛠️ 手動メンテナンス手順

#### 1. 管理画面から実行
```
1. MOSS COUNTRY管理画面にログイン
2. 「データベース最適化」→「メンテナンス」タブ
3. 「メンテナンス実行」ボタンをクリック
4. 実行結果を確認
```

#### 2. 直接SQL実行
```sql
-- 手動でのメンテナンス実行
SELECT run_automated_maintenance();
```

### 📋 メンテナンスチェックリスト

- [ ] 統計情報の更新完了
- [ ] 古いログのクリーンアップ実行
- [ ] インデックス健全性チェック完了
- [ ] パフォーマンス指標の確認
- [ ] エラーログの確認
- [ ] バックアップの実行確認

## セキュリティ対策

### 🔒 Row Level Security（RLS）

#### 設定済みポリシー
```sql
-- 管理者ユーザーテーブル
CREATE POLICY "管理者ユーザー選択ポリシー" ON admin_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- 監査ログテーブル（削除・更新禁止）
CREATE POLICY "監査ログ削除禁止" ON audit_logs FOR DELETE USING (false);
CREATE POLICY "監査ログ更新禁止" ON audit_logs FOR UPDATE USING (false);
```

### 🛡️ データ整合性制約

#### 制約の確認
- メールアドレス形式チェック
- パスワードハッシュ長チェック
- IPアドレス形式チェック
- 最後の管理者削除防止

### 🔐 アクセス制御

#### 関数実行権限
```sql
-- 認証済みユーザーのみ実行可能
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION run_automated_maintenance() TO authenticated;
```

## トラブルシューティング

### 🐛 一般的な問題と解決方法

#### 1. パフォーマンスの低下
**症状**: クエリ実行時間が長い
**確認方法**:
```sql
-- 実行計画の確認
EXPLAIN ANALYZE SELECT * FROM audit_logs WHERE user_id = 'xxx';
```
**対策**:
- インデックスの追加
- クエリの最適化
- 統計情報の更新

#### 2. キャッシュヒット率の低下
**症状**: キャッシュヒット率が90%を下回る
**対策**:
- shared_buffersの増加
- effective_cache_sizeの調整
- 頻繁に使用されるデータの特定

#### 3. ストレージ使用量の急増
**症状**: データベースサイズが予想以上に大きい
**対策**:
- 古いログのアーカイブ
- 不要なインデックスの削除
- データの圧縮

### 🔧 診断コマンド

#### データベース状態確認
```sql
-- テーブルサイズ確認
SELECT * FROM table_size_stats;

-- インデックス使用状況確認
SELECT * FROM index_usage_stats;

-- パフォーマンス統計確認
SELECT * FROM db_performance_stats;
```

#### 問題の特定
```sql
-- 使用されていないインデックスの確認
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- 大量のシーケンシャルスキャンが発生しているテーブル
SELECT * FROM pg_stat_user_tables WHERE seq_scan > idx_scan;
```

## 運用推奨事項

### 📅 定期的な作業

#### 日次
- [ ] データベース健全性の確認
- [ ] エラーログの確認
- [ ] バックアップの確認

#### 週次
- [ ] パフォーマンス指標の分析
- [ ] 古いログのクリーンアップ確認
- [ ] セキュリティログの確認

#### 月次
- [ ] インデックス使用状況の分析
- [ ] 容量計画の見直し
- [ ] パフォーマンステストの実行

### 🚀 最適化のベストプラクティス

#### 1. クエリ最適化
- 必要な列のみをSELECT
- 適切なWHERE条件の使用
- JOINよりもサブクエリが効率的な場合の判断

#### 2. インデックス管理
- 定期的な使用状況の確認
- 不要なインデックスの削除
- 複合インデックスの順序最適化

#### 3. データ管理
- 古いデータのアーカイブ戦略
- パーティショニングの検討
- データ圧縮の活用

### 💡 運用のコツ

1. **段階的な最適化**: 一度に多くの変更をせず、段階的に実施
2. **監視の継続**: 継続的な監視によりトレンドを把握
3. **テストの重要性**: 本番環境での変更前に十分なテスト
4. **ドキュメント管理**: 変更内容の記録と共有

## 📞 サポート・問い合わせ

### 技術的な問題
1. 管理画面での健全性チェック実行
2. ログファイルの確認
3. システム管理者への連絡

### 緊急時の対応
1. データベース接続エラー: Supabaseダッシュボード確認
2. パフォーマンス極端低下: 実行中クエリの確認
3. データ整合性問題: 管理者への即時連絡

---

**最終更新**: 2024年8月31日  
**バージョン**: 1.0  
**担当**: MOSS COUNTRY開発チーム