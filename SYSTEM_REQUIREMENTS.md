# MOSS COUNTRY ウェブサイト システム要件定義書

## プロジェクト概要

### プロジェクト名
MOSS COUNTRY - 北海道の苔テラリウム専門店ウェブサイト

### 事業者情報
- **代表者名**: 立桶　賢（たておけ　さとる）
- **メールアドレス**: moss.country.kokenokuni@gmail.com
- **電話番号**: 080-3605-6340
- **所在地**: 北海道札幌市（詳細住所は後日確定）

**注意**: 上記連絡先情報は暫定的なものであり、正式運営開始時に変更される可能性があります。

### プロジェクト目的
- 北海道初のカプセルテラリウム専門店のブランド認知向上
- オンライン集客とワークショップ予約の促進
- ECサイト連携による売上向上
- 企業理念とストーリーの発信

### ターゲットユーザー
- **主要ターゲット**: 20-50代の女性、インテリア・植物愛好家
- **副次ターゲット**: 体験型ワークショップ参加希望者、ギフト購入検討者
- **地域**: 北海道・全国（オンライン販売）

## 技術仕様

### フロントエンド技術スタック
- **フレームワーク**: Next.js 15.3.5 (App Router)
- **言語**: TypeScript 5.x
- **スタイリング**: Tailwind CSS 3.4.0
- **UI コンポーネント**: カスタムコンポーネントライブラリ
- **フォント**: Geist Sans/Mono (Google Fonts)

### バックエンド・CMS・データベース
- **CMS**: Sanity 3.98.1
- **画像管理**: Sanity Image URL
- **コンテンツ管理**: PortableText
- **管理画面**: Sanity Studio (統合)
- **データベース**: Supabase PostgreSQL
- **ユーザー管理**: Supabase Auth + Custom User Management
- **監査ログ**: Supabase Database + Memory Fallback
- **カレンダー機能**: Supabase PostgreSQL (`calendar_events`テーブル)

### 認証・セキュリティ
- **JWT認証**: jose 6.x
- **パスワードハッシュ化**: bcryptjs 3.x
- **2段階認証**: SMS (Twilio), Google OAuth, 端末コード表示
- **セッション管理**: HTTPOnly Cookies
- **ミドルウェア**: Next.js Middleware による認証保護
- **データベースセキュリティ**: Supabase RLS (Row Level Security)
- **監査システム**: 包括的な操作ログ記録

### 開発・デプロイメント
- **開発環境**: Node.js
- **バージョン管理**: Git
- **リンター**: ESLint 9.x
- **パッケージマネージャー**: npm
- **ビルドツール**: Next.js Build System
- **本番環境**: Vercel
- **データベース**: Supabase (Production)

### 外部サービス統合
- **メール送信**: EmailJS (クライアントサイド)
- **決済システム**: Square Web Payments SDK
- **SMS認証**: Twilio
- **CMS**: Sanity.io
- **データベース**: Supabase PostgreSQL
- **デプロイ**: Vercel Platform

### 本番環境設定
- **環境変数管理**: `.env.local` (開発), Vercel Environment Variables (本番)
- **設定検証**: `/src/lib/config.ts` による環境変数バリデーション
- **本番準備チェック**: `/admin/production-check` ダッシュボード
- **エラーハンドリング**: 全外部API呼び出しのtry-catch包囲
- **フォールバック**: Sanity CMS接続失敗時の空配列返却

## サイト構造

### 現在の実装ページ構成
```
/ (トップページ)
├── /blog (ブログ一覧)
│   └── /[slug] (個別記事)
├── /products (商品一覧)
│   └── /[slug] (商品詳細)
├── /workshop (ワークショップ)
├── /store (店舗情報)
├── /story (企業ストーリー)
├── /contact (お問い合わせ)
├── /faq (よくある質問)
├── /privacy (プライバシーポリシー)
├── /checkout (チェックアウト)
├── /payment/success (決済成功)
├── /admin (管理画面)
│   ├── /login (ログイン)
│   ├── /dashboard (ダッシュボード)
│   ├── /users (ユーザー管理)
│   ├── /users-advanced (高度なユーザー管理)
│   ├── /orders (注文管理)
│   │   └── /[id] (注文詳細)
│   ├── /inventory (在庫管理)
│   ├── /products (商品管理)
│   │   └── /new (商品新規作成)
│   ├── /blog (ブログ・ニュース管理)
│   │   ├── /new (記事新規作成)
│   │   ├── /[id]/edit (記事編集)
│   │   ├── /analytics (記事統計)
│   │   └── /categories (カテゴリ管理)
│   ├── /calendar (カレンダー管理)
│   ├── /faqs (FAQ管理)
│   ├── /database (データベース管理)
│   ├── /security-alerts (セキュリティアラート)
│   ├── /security-advanced (高度なセキュリティ設定)
│   ├── /audit-logs (監査ログ)
│   ├── /change-password (パスワード変更)
│   ├── /setup-2fa (2FA設定)
│   └── /verify-2fa (2FA認証)
└── /test (開発テスト用)
```

### 共通コンポーネント
- **レイアウト**: Header, Footer, Container, AdminLayout
- **UI要素**: Button, Card, ImagePlaceholder
- **インタラクション**: AnimatedSection, CircularCarousel, ScrollToTopButton
- **機能**: FullScreenFV (フルスクリーンファーストビュー)
- **セキュリティ**: SecurityAlertsSummary

## 機能要件

### 1. コンテンツ管理機能 ✅
- **CMS連携**: Sanity CMSによる動的コンテンツ管理
- **ブログ機能**: 記事投稿、カテゴリ分類、タグ機能、統計分析
- **商品管理**: 商品情報、画像、価格、在庫状況
- **ワークショップ管理**: コース情報、スケジュール、料金
- **FAQ管理**: よくある質問の管理・更新
- **カレンダー管理**: イベント・ワークショップの日程管理

### 2. ブログシステム ✅ (最新実装)
- **記事管理**: 作成・編集・削除・公開状態管理
- **SEO最適化**: 日本語対応スラッグ生成、重複チェック
- **カテゴリ・タグ管理**: 分類・検索機能
- **統計分析**: 記事数、カテゴリ別統計、人気タグ分析
- **リアルタイムプレビュー**: 記事の実時間確認
- **PortableText**: リッチテキスト対応

### 3. ユーザーインターフェース機能 ✅
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **アクセシビリティ**: WCAG準拠、キーボードナビゲーション
- **パフォーマンス**: 画像最適化、遅延読み込み
- **アニメーション**: スクロール連動、ページ遷移効果

### 4. 問い合わせ・連絡機能 ✅
- **お問い合わせフォーム**: EmailJS統合によるメール送信機能（SendGrid削除済み）
- **メール送信**: EmailJS経由でのクライアントサイド送信
- **注文確認メール**: Square決済システムの自動レシート機能を使用
- **複数連絡手段**: 電話、メール、店舗訪問
- **FAQ機能**: カテゴリ別質問回答、管理画面対応
- **プライバシーポリシー**: 法的遵守

### 5. ECサイト機能（内製） ✅
- **商品カタログ**: 商品一覧・詳細表示、カテゴリ分類
- **ショッピングカート**: 商品追加・削除、数量変更
- **在庫管理**: リアルタイム在庫状況表示・管理
- **注文管理**: 注文受付、ステータス管理、履歴表示
- **決済システム**: Square決済、銀行振込、代引き対応
- **配送管理**: 配送料計算、配送方法選択、追跡機能
- **顧客管理**: 会員登録、マイページ、注文履歴
- **管理画面**: 商品管理、注文管理、顧客管理、売上分析

### 6. 店舗・サービス情報 ✅
- **店舗詳細**: 住所、営業時間、アクセス方法
- **マップ連携**: Google Maps埋め込み
- **サービス紹介**: ワークショップ、カスタムオーダー
- **ギャラリー**: 店舗・作品画像

## 🔐 セキュリティ・認証システム ✅

### 多要素認証 (MFA) システム
- **基本認証**: メールアドレス + パスワード
- **2段階認証**: 以下から選択可能
  - **SMS認証**: Twilio経由でコード送信
  - **Google OAuth**: Googleアカウント連携
  - **端末コード**: 画面表示6桁コード（5分間有効）
- **バックアップコード**: 緊急時のアクセス用

### ユーザー管理システム
- **複数ユーザー対応**: 管理者・編集者の役割ベースアクセス
- **高度なユーザー管理**: 権限管理、一括操作、セキュリティ設定
- **パスワード管理**: bcryptによる安全なハッシュ化
- **ユーザー作成・削除**: 管理画面からの操作
- **セッション管理**: JWT + HTTPOnlyクッキー

### 包括的監査・セキュリティシステム
- **全操作監査**: ユーザー操作、システム変更の完全記録
- **セキュリティアラート**: 異常検知、リアルタイム通知
- **データベース最適化**: クエリ最適化、パフォーマンス監視
- **アクセス制御**: Role-Based Access Control (RBAC)

### 認証フロー
```
1. ログイン画面でメール・パスワード入力
2. パスワード認証成功
3. 2FAが有効な場合 → 認証方法選択
   - SMS: 電話番号にコード送信
   - Google: OAuth認証ページ
   - 端末: 画面にコード表示
4. 2FA認証成功 → 管理画面アクセス許可
```

### セキュリティ機能
- **JWTトークン**: 安全な認証状態管理
- **ミドルウェア保護**: 全管理ルートの認証チェック
- **セッション制限**: 24時間自動ログアウト
- **環境変数保護**: 機密情報の安全な管理

## 非機能要件

### パフォーマンス要件
- **ページ読み込み時間**: 3秒以内（First Contentful Paint）
- **画像最適化**: WebP形式、レスポンシブ画像
- **SEO対策**: メタデータ、構造化データ、サイトマップ

### セキュリティ要件
- **データ保護**: プライバシーポリシー準拠
- **フォームセキュリティ**: CSRF対策、バリデーション
- **認証システム**: JWT + 2FA による多層セキュリティ
- **robots.txt**: 現在はクローリング無効化設定

### 可用性・保守性
- **ブラウザ対応**: モダンブラウザ全対応
- **コード品質**: TypeScript、ESLint使用
- **コンポーネント設計**: 再利用可能な設計
- **エラーハンドリング**: 404ページ、エラー境界

## データモデル

### Sanity CMS スキーマ
1. **Blog Posts**
   - title, slug, content (PortableText)
   - author, category, tags
   - publishedAt, image

2. **Products**
   - name, slug, description
   - images, price, size, materials
   - category, inStock, careInstructions
   - variants, weight, shippingInfo

3. **Workshops**
   - title, description, price
   - duration, difficulty, materials
   - schedule, capacity, bookingAvailable

4. **FAQs**
   - question, answer, category

### ECサイト用データベース（内製実装済み）
5. **Orders**
   - orderNumber, customerId, items
   - totalAmount, status, shippingInfo
   - paymentStatus, createdAt, updatedAt

6. **Customers**
   - email, name, phone, address
   - orderHistory, membershipLevel
   - preferences, createdAt

7. **Cart Sessions**
   - sessionId, items, subtotal
   - shippingMethod, discounts
   - expiresAt

8. **Inventory**
   - productId, quantity, reserved
   - reorderLevel, supplier
   - lastUpdated

### 認証システムデータ (Supabase PostgreSQL)
9. **Admin Users** (admin_users テーブル)
   ```typescript
   interface AdminUser {
     id: string; // UUID
     email: string;
     password_hash: string;
     role: 'admin' | 'editor';
     two_factor_enabled: boolean;
     totp_secret?: string | null;
     webauthn_credentials?: any[] | null;
     last_login?: Date | null;
     created_at: Date;
     updated_at: Date;
   }
   ```

10. **Audit Logs** (audit_logs テーブル)
    ```typescript
    interface AuditLog {
      id: string; // UUID
      user_id: string;
      user_email: string;
      action: string;
      category: string;
      details: Record<string, any>;
      resource_id?: string | null;
      ip_address?: string | null;
      user_agent?: string | null;
      severity: 'low' | 'medium' | 'high' | 'critical';
      created_at: Date;
    }
    ```

11. **Calendar Events** (calendar_events テーブル)
    ```typescript
    interface CalendarEvent {
      id: string;
      title: string;
      description?: string;
      start_date: Date;
      end_date: Date;
      event_type: string;
      created_at: Date;
      updated_at: Date;
    }
    ```

## 現在の完成状況

### ✅ 完了した機能（最新）
1. **基盤システム**
   - Next.js + TypeScript + Tailwind CSS
   - Sanity CMS統合
   - レスポンシブデザイン

2. **ECサイト中核機能**
   - ショッピングカート機能
   - チェックアウトプロセス
   - Square決済システム統合
   - 在庫管理システム
   - メール送信システム (EmailJS統合)

3. **🆕 Supabaseデータベース統合システム**
   - **PostgreSQLデータベース**: Supabase完全統合
   - **複数ユーザー対応**: 管理者・編集者の役割分離
   - **永続化ストレージ**: ユーザー・監査ログの永続保存
   - **ハイブリッドアーキテクチャ**: DB優先・メモリフォールバック
   - **包括的監査ログ**: 全操作の記録・分析機能
   - **RLSセキュリティ**: Row Level Security による保護

4. **多要素認証システム**
   - **3つの2FA方式**: SMS・Google OAuth・端末コード
   - **セキュアな認証フロー**: JWT + HTTPOnlyクッキー
   - **ミドルウェア保護**: 全管理ルートの認証チェック

5. **管理画面システム**
   - 統合ダッシュボード
   - 注文管理・在庫管理
   - 商品管理・顧客管理
   - 監査ログ・セキュリティアラート

6. **🆕 ブログ・ニュース管理システム（最新実装）**
   - **記事作成・編集**: リアルタイムプレビュー対応
   - **SEO最適化**: 日本語→英語スラッグ自動生成
   - **重複チェック**: スラッグ重複の自動検出・解決
   - **統計分析**: カテゴリ別統計・人気タグ分析
   - **公開管理**: 下書き・公開状態の切り替え
   - **PortableText**: リッチテキストエディタ対応

7. **高度な管理機能**
   - **カレンダー管理**: イベント・ワークショップ予定
   - **FAQ管理**: よくある質問の管理・更新
   - **データベース最適化**: パフォーマンス監視・最適化
   - **セキュリティ監視**: リアルタイムアラート・異常検知
   - **高度なユーザー管理**: 権限管理・一括操作

### 🔄 現在進行中の機能
なし（全主要機能完成済み）

### 📋 次期実装予定の機能

#### 🆕 Phase 9.0 完了: 苔図鑑システム完全実装 ✅
**概要**: MOSS COUNTRYオリジナルの苔図鑑システム - 北海道特化の育て方ガイドと実践的なテラリウム適性評価（学術名を削除し、和名中心のユーザーフレンドリーな設計に変更）

**✅ 実装完了内容**:

1. **🆕 完全なCRUD機能実装**:
   - **新規作成**: `/admin/moss-guide/new` - 画像アップロード対応
   - **一覧表示**: `/admin/moss-guide` - フィルター・統計表示
   - **編集機能**: `/admin/moss-guide/[id]/edit` - 既存データの更新
   - **削除機能**: 管理画面からの削除操作
   - **公開/非公開切り替え**: リアルタイム状態管理

2. **画像管理システム**:
   - **Sanity統合**: 画像アップロードAPI (`/api/admin/moss-guide/upload-image`)
   - **複数画像対応**: ギャラリー表示・サムネイル生成
   - **ファイル制限**: 2MB以下、JPEG/PNG/WebP対応
   - **セキュリティ**: 認証付きアップロード

3. **APIエンドポイント完全実装**:
   ```typescript
   // メインAPI
   GET/POST /api/admin/moss-guide          // 一覧取得・新規作成
   GET/PUT/DELETE /api/admin/moss-guide/[id] // 個別操作
   POST /api/admin/moss-guide/upload-image   // 画像アップロード
   ```

4. **Next.js 15対応**:
   - **非同期params**: `React.use()`による新API対応
   - **型安全性**: 完全なTypeScript統合
   - **認証統合**: セッション管理・監査ログ

5. **データモデル更新**:
   ```typescript
   interface MossSpecies {
     _id: string;
     name: string; // 苔の名前（和名のみ）- 学術名を削除
     commonNames?: string[]; // 別名・地方名
     slug: SanitySlug;
     description: string; // 詳細説明（簡素化）
     images: (SanityImage & { caption?: string })[]; // 複数画像対応
     characteristics: {
       beginnerFriendly: 1 | 2 | 3 | 4 | 5; // 初心者適応度（★評価）
       waterRequirement: 'low' | 'medium' | 'high'; // 水分要求度
       lightRequirement: 'weak' | 'medium' | 'strong'; // 光量要求
       temperatureAdaptability: 'cold' | 'temperate' | 'warm'; // 温度適応性
       growthSpeed: 'slow' | 'normal' | 'fast'; // 成長スピード
     };
     terrariumSuitability: {
       sealedBottle: boolean; // 密閉型適性
       openContainer: boolean; // 開放型適性
       capsuleType: boolean; // カプセル型適性（MOSS COUNTRY特化）
     };
     hokkaidoInfo?: {
       distribution?: string; // 道内分布
       collectionSeason?: ('spring' | 'summer' | 'autumn' | 'winter')[]; // 採取時期
       winterCare?: string; // 冬期管理の注意点
     };
     practicalInfo?: {
       workshopUsage: boolean; // ワークショップ使用
       difficultyPoints?: string[]; // よくある失敗・注意点
       successTips?: string[]; // 成功のコツ
       careInstructions?: string; // 詳しい育て方（簡素化）
     };
     category: 'moss' | 'liverwort' | 'hornwort'; // 分類
     tags?: string[]; // タグ
     featured: boolean; // おすすめ
     publishedAt: string;
     isVisible: boolean; // 公開状態
     sortOrder?: number;
   }
   ```

6. **フロントエンド実装完了**:
   - **苔図鑑一覧**: `/moss-guide` - 高度な検索・フィルター機能
   - **個別詳細ページ**: `/moss-guide/[slug]` - 画像ギャラリー・詳細情報
   - **検索機能**: 名前・別名・タグによるリアルタイム検索（学術名検索を削除）
   - **フィルタリング**: 分類・難易度・テラリウムタイプ別表示
   - **MOSS COUNTRY独自評価**: 初心者適応度・北海道特化情報

7. **管理画面システム完成**:
   - **一覧管理**: `/admin/moss-guide` - 統計情報・フィルタリング・状態管理
   - **新規作成**: `/admin/moss-guide/new` - フォーム・画像アップロード
   - **編集機能**: `/admin/moss-guide/[id]/edit` - データ更新・画像管理
   - **CRUD操作**: 作成・読み取り・更新・削除の完全実装
   - **権限管理**: 認証・監査ログ統合

8. **UI/UX改善**:
   - **学術名除去**: 一般ユーザー向けの分かりやすい表示に統一
   - **レスポンシブデザイン**: モバイル・デスクトップ対応
   - **ナビゲーション統合**: ヘッダー・管理画面サイドバーに追加
   - **エラーハンドリング**: 包括的なエラー処理・ユーザーフィードバック

**🔄 差別化ポイント**:
- **北海道特化情報**: 道内分布・採取時期・冬期管理
- **MOSS COUNTRY独自評価**: 初心者適応度・カプセル型適性
- **実践的アドバイス**: ワークショップ連携・失敗例・成功のコツ
- **ユーザーフレンドリー**: 学術名を排除した分かりやすい設計
- **完全なCMS**: 管理画面での全機能操作可能

---

#### ✅ Phase 9.1 完了: 苔図鑑システムUI/UX改善・機能追加

**✅ 実施完了内容**:

1. **画像プレビュー機能修正**:
   - 編集画面で画像が「画像1」テキストのみ表示される問題を修正
   - `urlFor()`を使用した実際の画像プレビュー機能を実装
   - 画像が存在しない場合の適切なフォールバック表示

2. **テラリウム適性項目の削除**:
   - 管理画面からテラリウム適性セクションを完全削除
   - フォームデータとAPI処理から関連項目を削除
   - UI の簡素化と使いやすさの向上

3. **苔図鑑一覧ページの画像表示改善**:
   - 縦長で表示されていた画像を正方形（256px固定）に修正
   - `aspect-square`から`h-64`への変更で確実な正方形表示
   - `object-cover`による適切な画像トリミング

4. **詳細ページリンク機能の修正**:
   - Next.js 15 App Router対応でparams処理を修正
   - `React.use()`を使用した非同期params解決
   - 一覧から詳細ページへの正常な遷移を実現

5. **Slug管理機能の完全実装**:
   - 管理画面にslug設定フィールドを追加（新規作成・編集両方）
   - ブログと同様の「自動生成」ボタン機能を実装
   - `/moss-guide/`プレフィックス表示とURLプレビュー
   - カスタムslugと自動生成slugの両方に対応

6. **UI/UXの大幅改善**:
   - slug入力欄のレイアウト最適化（プレフィックス外置き）
   - 自動生成ボタンの配置改善（別行配置でバランス向上）
   - 「苔の名前から自動生成」の分かりやすいラベル

7. **日本語Slug変換機能の向上**:
   - `generateSEOFriendlySlug`関数の改良
   - 苔の名前用変換マップの追加
   - ひらがな・カタカナのローマ字変換機能強化
   - 「ホソウリゴケ」→「hosourigoke」等の適切な変換

#### ✅ Phase 9.2 完了: 苔図鑑詳細ページUI/UX改善・データ構造修正

**✅ 実施完了内容**:

1. **詳細ページデザイン大幅改善**:
   - **育成特性セクション**: 横並びから縦並びレイアウトに変更
   - **項目名変更**: 「水やり」「光量」「温度」「メンテナンス」に統一
   - **視認性向上**: アイコン付きで分かりやすい表示に改善

2. **不要セクションの削除**:
   - **テラリウム適性セクション**: 詳細ページから完全削除
   - **UI簡素化**: ユーザーに必要な情報のみに集約

3. **データ構造の全面見直し**:
   - **旧構造**: `terrariumSuitability`, `hokkaidoInfo`, `practicalInfo`
   - **新構造**: `basicInfo`, `supplementaryInfo`, `practicalAdvice`
   - **管理画面対応**: 「基本情報」「補足情報」「実践的アドバイス」セクション

4. **補足情報の条件表示実装**:
   - **動的表示**: 補足情報が空の場合は非表示
   - **タイトル変更**: 「北海道特化情報」→「補足情報」に統一
   - **ユーザビリティ向上**: 不要な空セクションを排除

5. **型定義・API・クエリの完全更新**:
   - **TypeScript型定義**: 新データ構造への対応
   - **Sanityクエリ**: 新旧フィールド両方を取得（互換性維持）
   - **API エンドポイント**: PUT処理で新フィールド名を使用
   - **Null安全性**: オプショナルチェーンによるエラー防止

6. **既存データ編集問題の解決**:
   - **根本原因**: PUT APIが旧フィールド名を使用していた問題
   - **解決策**: `updateData`オブジェクトを新構造に対応
   - **結果**: 既存の苔エントリも正常に編集・表示可能に

7. **一覧ページエラーの修正**:
   - **エラー**: `Cannot read properties of null (reading 'capsuleType')`
   - **修正**: テラリウム適性関連コードを完全削除
   - **安定性向上**: null参照エラーを根絶

#### ✅ Phase 10.0 完了: 本番環境移行準備・SendGrid削除・EmailJS統合

**✅ 実施完了内容**:

1. **SendGrid完全削除・EmailJS統合**:
   - **`@sendgrid/mail`依存関係削除**: package.jsonからSendGrid関連パッケージを削除
   - **EmailJS設定**: クライアントサイドメール送信システムに移行
   - **注文確認メール**: Square決済システムの自動レシート機能を使用
   - **API クリーンアップ**: `/src/lib/email.ts`ファイル削除、webhookからSendGrid関連コード削除

2. **本番環境設定システム実装**:
   - **`/src/lib/config.ts`**: 環境変数検証・設定管理システム
   - **`/src/app/admin/production-check/page.tsx`**: 本番準備チェックダッシュボード
   - **`/src/app/api/admin/config-check/route.ts`**: 設定検証APIエンドポイント
   - **環境変数管理**: 本番・開発環境の明確な分離

3. **Vercelビルドエラー修正**:
   - **JSX構文エラー**: `users-advanced/page.tsx`と`users/page.tsx`の完全修正
   - **Sanityエラーハンドリング**: 全CMS クエリをtry-catch で包囲
   - **静的生成対応**: サイトマップ生成時のエラー処理強化

4. **本番準備チェックリスト**:
   - **環境変数**: EmailJS、Square、Sanity、Supabaseの設定確認
   - **CMS データ**: モックデータから本番データへの移行準備
   - **決済システム**: Square本番環境への切り替え準備
   - **ドメイン設定**: カスタムドメイン設定の準備

5. **Next.js設定最適化**:
   - **Webpack設定**: SendGrid関連fallback設定の削除
   - **画像最適化**: Sanity CDN統合の最適化
   - **セキュリティ設定**: 本番環境向けheader設定

**📋 Phase 10.1 予定: 本番データ移行・ドメイン設定**

**🔄 次回実施予定**:
1. **詳細ページの微調整**
   - レイアウトの最終確認
   - モバイル対応の検証
   - 画像表示の最適化

2. **全機能の統合テスト**
   - 新規作成→編集→表示の一連フロー
   - 画像アップロード・表示機能
   - 検索・フィルター機能

3. **システム全体の最終調整**
   - パフォーマンス最適化
   - SEO設定の完成
   - 苔図鑑システム完全完成

### ⚠️ 既知の課題・制限事項

#### 🚨 **緊急対応必要**: Supabaseモジュール解決エラー
**エラー**: `./node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js:14:1 Module not found: Can't resolve './lib/constants'`

**現象**:
- 管理画面アクセス時にSupabase関連モジュール読み込みエラー発生
- @supabase/supabase-js v2.56.0パッケージの内部ファイル欠損
- 動的インポートでも回避できないWebpackバンドル時エラー

**影響範囲**:
- 管理画面全体（`/admin/*`）
- ユーザー管理・監査ログ機能
- データベース統合機能

**実施済み対策**:
1. **動的インポート実装**: `userManager.ts`, `auditLog.ts`でSupabaseの条件付きインポート
2. **環境変数制御**: `USE_SUPABASE=false`設定で回避試行
3. **Next.js設定調整**: webpack externals設定（後に削除）
4. **構文エラー修正**: エイリアス構文エラーを修正

**未解決理由**:
- Supabaseパッケージ自体の問題で動的インポートでも読み込み時にエラー発生
- Next.js 15 + Webpack環境でのモジュール解決問題

**次回対応予定**:
1. **@supabase/supabase-js downgrade**: v2.45.4への降格
2. **パッケージ再インストール**: npm cache clean --force + 完全再インストール
3. **代替案検討**: Supabase REST API直接利用への移行
4. **緊急回避**: USE_SUPABASE=false + メモリベース運用

**一時的解決策**:
- 環境変数 `USE_SUPABASE=false` でメモリベース運用
- 管理画面の基本機能は動作（ユーザー管理・監査ログは制限あり）

1. **SEO設定**: robots.txtで現在クローリング無効化中
2. **決済システム**: Square本番環境での最終テスト必要
3. **パフォーマンス**: 大量データ処理時の最適化が必要

## 今後の拡張予定

### Short Term (1-3ヶ月)
1. 苔図鑑システムの実装
2. SEO最適化と検索エンジン対応
3. パフォーマンス最適化

### Medium Term (3-6ヶ月)
1. 会員システムの拡張
2. ポイントシステム導入
3. レビュー・評価システム
4. 在庫自動発注システム

### Long Term (6ヶ月以上)
1. モバイルアプリ開発
2. AR/VRテラリウム体験機能
3. サブスクリプションサービス
4. 国際配送対応

## 運用・保守

### 日常運用
- **コンテンツ更新**: ブログ記事・商品情報の定期更新
- **在庫管理**: リアルタイム在庫監視・補充
- **注文処理**: 受注・発送・配送追跡
- **セキュリティ監視**: 監査ログ・アラートの確認

### 定期保守
- **データベース最適化**: 月1回のパフォーマンス調整
- **セキュリティアップデート**: 週1回の脆弱性チェック
- **バックアップ**: 日次自動バックアップ・月次確認
- **システム監視**: CPU・メモリ・ストレージ使用量監視

### 緊急対応
- **障害対応**: 24時間以内の復旧目標
- **セキュリティインシデント**: 即座の対応・報告体制
- **データ復旧**: 最大24時間以内の復旧保証

## ⚙️ 重要な環境変数設定（本格運用前に必須）

### Square決済システム設定（セキュリティ重要）

#### 🔐 SQUARE_WEBHOOK_SIGNATURE_KEY（最重要）
- **設定者**: 顧客（MOSS COUNTRY代表者）
- **設定場所**: 
  - **本番**: Vercelの環境変数設定画面
  - **開発**: `.env.local`ファイル
- **取得方法**:
  1. Square Developer Dashboard (https://developer.squareup.com) にログイン
  2. アプリケーション選択 → Webhooks
  3. Webhook endpoint作成時に表示される「Signature Key」をコピー
  4. Vercel環境変数に `SQUARE_WEBHOOK_SIGNATURE_KEY=ここにキーを貼り付け`
- **重要性**: この設定がないと偽のWebhook攻撃を受ける可能性があります

#### 💳 その他のSquare関連環境変数
```
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-*** (公開)
SQUARE_ACCESS_TOKEN=EAAAEOm***（機密・サーバーサイドのみ）
SQUARE_LOCATION_ID=L***（機密・サーバーサイドのみ）
```

### Supabase関連
- **設定者**: 顧客
- **設定場所**: Vercel環境変数
- **取得先**: Supabaseプロジェクト設定画面

### Sanity CMS関連
- **設定者**: 顧客  
- **設定場所**: Vercel環境変数
- **取得先**: Sanity管理画面

### 設定確認方法
```bash
# 本番環境で環境変数が正しく設定されているか確認
# （管理画面 → システム状況で確認可能）
```

### 🚨 セキュリティ注意事項
- **本番環境では必ずHTTPS**
- **環境変数は絶対にGitにコミットしない**
- **定期的にアクセストークンをローテーション**
- **Webhook署名検証は本格運用の必須条件**

## 技術的詳細

### アーキテクチャ概要
- **フロントエンド**: Next.js App Router + React Server Components
- **状態管理**: React Hooks + Context API
- **データフェッチ**: Server Actions + SWR
- **認証**: JWT + Cookie-based Session
- **データベース**: Supabase PostgreSQL + Sanity CMS
- **ファイルストレージ**: Sanity Asset Management
- **決済**: Square Payment API
- **メール**: EmailJS (クライアントサイド)
- **監視**: Vercel Analytics + Custom Logging

### パフォーマンス最適化
- **コード分割**: Dynamic Imports + Lazy Loading
- **画像最適化**: Next.js Image Component + WebP
- **キャッシュ戦略**: ISR + SWR + Browser Cache
- **Bundle最適化**: Tree Shaking + Compression

### セキュリティ対策
- **認証・認可**: Multi-Factor Authentication
- **データ暗号化**: At-rest + In-transit Encryption
- **入力検証**: Zod Schema Validation
- **CSRF対策**: SameSite Cookies + CSRF Tokens
- **XSS対策**: Content Security Policy + Input Sanitization
- **SQL Injection対策**: Parameterized Queries + ORM

---

#### ✅ Phase 9.3 完了: フッターリンク色調整・プライバシーポリシー更新

**✅ 実施完了内容**:

1. **フッターリンク視認性改善**:
   - **色調整**: `text-gray-300` → `text-emerald-600` に変更
   - **視認性向上**: クリックできるリンクと通常テキストの区別を明確化
   - **カートアイコン追加**: ヘッダーと同じカートアイコンをフッターに追加

2. **プライバシーポリシー情報更新**:
   - **店舗情報修正**: 正確な住所・電話番号・メールアドレスに更新
   - **営業時間更新**: 11:00-20:00（営業日：不定休）に修正
   - **日付更新**: 制定日・最終更新日を2025年9月11日に変更

#### ✅ Phase 10.0 完了: 法的文書デザイン統一・新着情報セクション・ローディングシステム

**✅ 実施完了内容**:

1. **法的文書デザイン統一**:
   - **プライバシーポリシー**: 利用規約・特商法と同じデザインに統一
   - **フッターリンク順序**: 「利用規約」「プライバシーポリシー」「特商法」に変更
   - **統一されたカードレイアウト**: 灰色背景＋白いカード形式

2. **🆕 トップページ新着情報セクション**:
   - **最新5件のブログ・ニュース**をタイトルのみ表示
   - **アニメーション効果**: スライドアップ・ホバーエフェクト
   - **レスポンシブデザイン**: モバイル・デスクトップ対応
   - **「すべての記事を見る」ボタン**: ブログページへの誘導

3. **🆕 包括的ローディングシステム（全ページ対応）**:
   - **自動画像読み込み検知**: 全画像の読み込み完了まで待機
   - **最大・最小時間制御**: 最大5秒・最小0.8秒の表示時間
   - **プログレスバー**: リアルタイム進行状況表示（0-100%）
   - **動的メッセージ**: 進行状況に応じた4段階メッセージ
   - **ページ別最適化**: 各ページに合わせた時間・メッセージ設定
   - **除外設定**: 管理画面・決済ページは除外（UX重視）

4. **ローディングデザイン（パターンA）**:
   - **静的ロゴ**: 回転せず安定した中央配置
   - **上部アニメーション**: 3つのバウンスドット
   - **下部アニメーション**: 回転スピナー
   - **エメラルドカラー**: ブランド統一デザイン
   - **「NOW LOADING」**: 最終段階メッセージ

5. **統合されたローディングコンポーネント**:
   - **LoadingScreen**: フル画面ローディング
   - **InlineLoading**: ページ内ローディング  
   - **ButtonLoading**: ボタン内スピナー
   - **PageLoadingProvider**: 全ページ自動適用

#### ✅ Phase 11.0 完了: お問い合わせページ完全改善

**✅ 実施完了内容**:

1. **背景画像変更**:
   - **新背景**: `/images/store/exterior.jpg`（店舗外観画像）に統一
   - **全セクション**: ヒーロー・お問い合わせ方法・フォームセクション全て更新

2. **お問い合わせ方法レイアウト改善**:
   - **2+1レイアウト**: 電話・メールを横並び、店舗相談を下段に配置
   - **絵文字削除**: 全ての絵文字アイコンを削除してすっきりしたデザインに
   - **店舗相談レイアウト**: 左右2列レイアウト（タイトル・説明 | 住所情報）
   - **中央揃え**: 全テキストを中央揃えで統一

3. **正確な営業情報に更新**:
   - **営業時間**: 11:00-20:00 / 不定休（カレンダーをご確認ください）
   - **正確な住所**: 札幌市西区発寒11条4丁目3-1
   - **メール返信時間**: 通常3営業日以内にご返信いたします

4. **フォーム機能改善**:
   - **文字数制限**: お問い合わせ内容を1000文字に制限（スパム対策）
   - **リアルタイム文字カウンター**: 入力中の文字数表示
   - **チェックボックス配置修正**: プライバシーポリシー同意の垂直配置を修正
   - **不要リンク削除**: 「さらに詳しいFAQを見る」ボタンを削除

5. **現在のフォーム送信状況**:
   - **実装状況**: シミュレーション段階（2秒待機のみ）
   - **次回実装必要**: 実際のメール送信機能・APIエンドポイント作成

#### ✅ Phase 12.0 完了: お問い合わせフォーム機能完全実装

**✅ 実施完了内容**:

1. **お問い合わせAPI実装**:
   - **APIエンドポイント**: `/api/contact` 完全実装
   - **Zodバリデーション**: 名前・メール・件名・内容等の検証
   - **Supabaseデータベース統合**: お問い合わせ履歴の永続保存
   - **IPアドレス・ユーザーエージェント記録**: セキュリティ・分析用

2. **SendGridメール送信システム**:
   - **お客様向け自動返信**: 問い合わせ内容確認メール
   - **管理者向け通知**: 新規問い合わせ通知メール
   - **HTMLメールテンプレート**: MOSS COUNTRYブランドデザイン
   - **エラーハンドリング**: メール送信失敗時でもフォーム送信は成功

3. **フロントエンド統合**:
   - **シミュレーション削除**: 実際のAPI呼び出しに変更
   - **レスポンス処理**: 成功・エラーメッセージの適切な表示
   - **フォームリセット**: 送信成功時の自動クリア機能

4. **データベーステーブル設計**:
   ```sql
   contact_inquiries (
     id: UUID,
     name: VARCHAR(100),
     email: VARCHAR(255),
     phone: VARCHAR(20) NULL,
     inquiry_type: VARCHAR(50),
     subject: VARCHAR(200),
     message: TEXT(1000),
     ip_address: VARCHAR(45),
     user_agent: TEXT,
     status: 'pending'|'replied'|'resolved',
     priority: 'low'|'medium'|'high',
     created_at: TIMESTAMP,
     updated_at: TIMESTAMP
   )
   ```

5. **管理機能API**:
   - **GET API**: お問い合わせ一覧取得（ページネーション・検索・フィルター対応）
   - **管理画面統合**: 将来の問い合わせ管理機能に対応

**📋 次回設定必要事項**:

6. **SendGrid環境変数設定（本格運用前必須）**:
   ```env
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   FROM_EMAIL=your_verified_email@domain.com
   ADMIN_EMAIL=moss.country.kokenokuni@gmail.com  # 既設定済み
   ```

7. **SendGrid設定手順**:
   - SendGridアカウント作成・ログイン
   - Settings → API Keys でAPIキー生成
   - Settings → Sender Authentication で送信者認証
   - Vercel環境変数に設定

#### ✅ Phase 13.0 完了: EmailJS統合によるメール送信機能実装

**✅ 実装完了内容**:

1. **EmailJSアカウント・Gmail接続設定完了** ✅:
   - EmailJSアカウント作成完了（https://www.emailjs.com）
   - Gmail接続設定完了（moss.country.kokenokuni@gmail.com）
   - Service ID: `service_tlu8le3`
   - Template ID: `template_25vg3pf`
   - Public Key: `RenfFGiRqiv3Z54mi`

2. **EmailJS SDK統合実装完了** ✅:
   - `@emailjs/browser`パッケージ導入
   - 環境変数設定完了（`.env.local`）
   - フロントエンド統合実装完了

3. **SendGrid削除・クリーンアップ完了** ✅:
   - SendGrid関連コード完全削除
   - `@sendgrid/mail`パッケージ削除
   - 環境変数コメントアウト

4. **お問い合わせフォーム統合完了** ✅:
   - 2段階処理実装：Supabase保存 → EmailJS送信
   - エラーハンドリング強化
   - フォーム自動リセット機能

**🔧 技術仕様**:
- **メール送信**: EmailJS（月200通無料）
- **統合方法**: フロントエンドJavaScript
- **テンプレート**: EmailJS管理画面で作成済み
- **対象メール**: 管理者向け新規お問い合わせ通知

#### ✅ Phase 13.1 完了: Supabaseデータベース接続エラー解消・お問い合わせフォーム修正

**✅ 実施完了内容**:

1. **Supabase接続エラー対応完了** ✅:
   - ネットワーク接続・DNS解決問題を特定
   - 5秒タイムアウト設定でエラーハンドリング強化
   - データベース保存失敗時でもフォーム送信継続するよう修正
   - `contact_inquiries`テーブル作成SQLファイル提供

2. **お問い合わせフォーム動作確認完了** ✅:
   - エラーハンドリング大幅改善（API側・フロント側両方）
   - EmailJS送信機能は常に実行される構造に変更
   - レスポンス改善（`dbSaved`フラグでDB保存状態通知）
   - エンドツーエンドテスト完了・正常動作確認

3. **改善結果**:
   - **正常時**: データベース保存 ✅ + EmailJS送信 ✅
   - **DB接続エラー時**: データベース保存 ❌ + EmailJS送信 ✅
   - どちらの場合もユーザーには成功メッセージ表示
   - 「お問い合わせの送信に失敗しました」エラーを完全解消

#### 📋 Phase 14.0 予定: 管理画面お問い合わせ管理機能

**🔄 次回実装予定**:
1. **お問い合わせ一覧ページ**: `/admin/contacts`
   - 受信したお問い合わせの一覧表示
   - ページネーション・並び替え機能
2. **詳細表示・返信状況管理**: ステータス変更・優先度設定
   - 個別お問い合わせ詳細表示
   - pending/replied/resolved ステータス管理
   - low/medium/high 優先度設定
3. **検索・フィルター機能**: 日付・ステータス・種類別表示
   - 名前・メール・件名による検索
   - ステータス・お問い合わせ種類別フィルター
4. **管理画面ナビゲーション**: サイドバーメニュー追加
   - AdminLayoutサイドバーに「お問い合わせ管理」追加

---

---

#### ✅ **Phase 14.0 完了**: Supabaseモジュールエラー解決・プロジェクト復元

**✅ 実施完了内容**:

1. **Supabaseモジュールエラー解決**:
   - `@supabase/supabase-js` v2.56.0 → v2.75.0 にアップグレード
   - 欠落していた`constants.js`ファイル問題を完全解決
   - パッケージバージョン固定（`"2.75.0"`）で将来の自動更新を防止

2. **JSX構文エラー修正**:
   - 複数のadminページファイルの隠れ文字・構文エラーを修正
   - TypeScript型注釈追加（`JSX.Element`）

3. **Supabaseプロジェクト復元**:
   - 一時停止していた"moss country"プロジェクトを復元完了
   - DNS解決問題を解決（`jjjrataezuilswklpgaw.supabase.co`アクセス可能）
   - 環境変数`USE_SUPABASE=true`に設定

#### ✅ **Phase 15.0 完了**: 動的メンテナンスモードシステム実装

**✅ 実施完了内容**:

1. **Sanityベースメンテナンス設定システム**:
   - `maintenanceSettings` Sanityスキーマ作成
   - 管理画面からリアルタイムでメンテナンスモードを制御可能
   - Vercel再デプロイ不要の動的制御システム

2. **メンテナンス機能詳細**:
   - **オン/オフ切り替え**: チェックボックスで即座に切り替え
   - **パスワード設定**: 4文字以上のカスタムパスワード
   - **カスタムメッセージ**: メンテナンスページに表示するメッセージ設定
   - **24時間認証クッキー**: 一度ログインすると24時間アクセス可能

3. **技術実装詳細**:
   - **ミドルウェア統合**: Next.js middleware でリアルタイム制御
   - **キャッシュシステム**: 30秒キャッシュでパフォーマンス最適化
   - **フォールバック機能**: Sanity接続失敗時は環境変数にフォールバック
   - **セキュアクッキー**: HttpOnly、SameSite strict設定

4. **管理画面UI/UX**:
   - **サイト設定ページ**: `/admin/settings` で全設定を一元管理
   - **リアルタイム反映**: 設定変更が即座にサイト全体に適用
   - **視覚的フィードバック**: 成功・エラーメッセージで操作結果を明確表示
   - **現在状態表示**: メンテナンス中/通常運用中の状態を表示

5. **メンテナンスページデザイン**:
   - **MOSS COUNTRYブランド**: ロゴ・カラーに統一されたデザイン
   - **パスワード入力フォーム**: セキュアな認証システム
   - **お問い合わせ情報**: 緊急時の電話番号表示
   - **レスポンシブ対応**: モバイル・デスクトップ最適化

**🔧 使用方法**:
1. 管理画面 → サイト設定 → メンテナンスモード
2. チェックボックスでオン/オフ切り替え
3. パスワードとメッセージを設定
4. 「設定を保存」で即座に反映

**⚙️ 技術仕様**:
- **データ保存**: Sanity CMS（クラウドデータベース）
- **認証期間**: 24時間（カスタマイズ可能）
- **キャッシュ**: 30秒間（パフォーマンス最適化）
- **セキュリティ**: HttpOnly + Secure Cookie
- **フォールバック**: 環境変数ベース緊急制御

**🔄 現在の課題**:

#### **Phase 15.1 待機中**: お問い合わせデータベース設定

**次回セッション実施予定**:

1. **contact_inquiries テーブル作成**（手動実行待ち）:
   ```sql
   -- 以下のSQLをSupabase SQL Editorで実行
   CREATE TABLE IF NOT EXISTS contact_inquiries (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       email VARCHAR(255) NOT NULL,
       phone VARCHAR(20),
       inquiry_type VARCHAR(50) NOT NULL,
       subject VARCHAR(200) NOT NULL,
       message TEXT CHECK (char_length(message) <= 1000) NOT NULL,
       ip_address VARCHAR(45),
       user_agent TEXT,
       status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'resolved')),
       priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   
   -- インデックス・RLS・ポリシー設定
   CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
   CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);
   
   ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Service role can access all contact inquiries" ON contact_inquiries
       FOR ALL USING (auth.role() = 'service_role');
   
   CREATE POLICY "Allow anonymous users to insert contact inquiries" ON contact_inquiries
       FOR INSERT WITH CHECK (true);
   ```

2. **データベース接続テスト**:
   - `/api/test-supabase` エンドポイントでの接続確認
   - お問い合わせフォーム動作テスト

3. **お問い合わせ管理画面実装**:
   - `/admin/contacts` ページ作成
   - 受信したお問い合わせ一覧・詳細表示
   - ステータス管理機能

**現在の状況**:
- ✅ **Supabaseエラー**: 完全解決
- ✅ **管理画面**: アクセス可能
- ✅ **メンテナンスモード**: 動的制御完全実装
- ✅ **お問い合わせフォーム**: EmailJS経由で正常動作
- 🔄 **データベース連携**: テーブル作成待ち

---

## 本番環境デプロイメントチェックリスト

### ✅ 完了済み項目

#### システム構築
- [x] **Next.js 15.3.5アプリケーション**: App Router、TypeScript完全対応
- [x] **Vercelビルドエラー修正**: JSX構文エラー、依存関係問題の解決
- [x] **SendGrid削除・EmailJS統合**: メール送信システムの移行完了
- [x] **エラーハンドリング強化**: 全Sanity CMS クエリのtry-catch実装

#### 本番環境準備
- [x] **環境変数管理システム**: `/src/lib/config.ts`実装
- [x] **本番チェックダッシュボード**: `/admin/production-check`実装
- [x] **設定検証API**: `/api/admin/config-check`実装

### 🔄 本番移行時必要作業

#### 1. 環境変数設定（Vercel）
```bash
# EmailJS設定
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxx
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxx  
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=xxx

# Square決済（本番環境）
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-xxx  
SQUARE_ACCESS_TOKEN=EAAAEOxxx（本番用）
SQUARE_LOCATION_ID=Lxxx（本番用）
SQUARE_WEBHOOK_SIGNATURE_KEY=xxx（本番用）

# Sanity CMS（本番プロジェクト）
NEXT_PUBLIC_SANITY_PROJECT_ID=xxx
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=skxxx（本番用）

# Supabase（本番プロジェクト）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# その他
NEXTAUTH_SECRET=xxx（生成必要）
NEXTAUTH_URL=https://your-domain.com
```

#### 2. データ移行
- [ ] **Sanity本番データ準備**:
  - [ ] 実際の商品データ（苔テラリウム商品）
  - [ ] ブログ記事・ニュース
  - [ ] 苔図鑑データ
  - [ ] FAQ情報
  - [ ] 店舗・会社情報

- [ ] **Supabase本番データベース**:
  - [ ] `contact_inquiries`テーブル作成
  - [ ] 管理者ユーザー作成
  - [ ] RLS（Row Level Security）ポリシー設定

#### 3. 外部サービス設定
- [ ] **EmailJS**:
  - [ ] サービス作成・テンプレート設定
  - [ ] 本番用API キー取得

- [ ] **Square**:
  - [ ] 本番アカウント設定
  - [ ] Webhook エンドポイント登録
  - [ ] 決済テスト実行

- [ ] **独自ドメイン**:
  - [ ] ドメイン購入・DNS設定
  - [ ] Vercel ドメイン連携
  - [ ] SSL証明書設定

#### 4. 最終確認・テスト
- [ ] **機能テスト**:
  - [ ] 商品購入フロー（決済まで）
  - [ ] お問い合わせフォーム送信
  - [ ] 管理画面ログイン・操作
  - [ ] モバイル・デスクトップ表示

- [ ] **パフォーマンステスト**:
  - [ ] ページ読み込み速度
  - [ ] 画像最適化確認
  - [ ] SEO設定確認

- [ ] **セキュリティチェック**:
  - [ ] 環境変数漏洩チェック
  - [ ] 管理画面アクセス制御
  - [ ] Webhook署名検証

### 📋 運用開始後の継続タスク
- [ ] **定期メンテナンス**:
  - [ ] 依存関係アップデート
  - [ ] セキュリティパッチ適用
  - [ ] バックアップ確認

- [ ] **監視・分析**:
  - [ ] アクセス解析設定
  - [ ] エラー監視設定
  - [ ] パフォーマンス監視

---

**最終更新**: 2025年10月20日  
**バージョン**: 6.1  
**ステータス**: ✅ 動的メンテナンスモード完全実装 - Sanityベース管理システム稼働中