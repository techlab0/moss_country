# PayPay 決済 中継スクリプト（Xserver設置用）

PayPayの本番APIは「PayPay for Businessに登録した固定IPからのみ」呼び出しを許可する
（サンドボックスにはこの制限が無い）。Vercel（サーバレス）はIPを固定できないため、固定IPを持つ
Xserverにこの中継スクリプトを設置し、PayPay APIへのリクエストは常にこのXserverから送信する構成にする。

```
Vercel(サイト) → Xserver上の paypay-relay.php（固定IP） → PayPay OPA API
```

**ECチェックアウトのウェブ決済（`src/lib/paypayWebClient.ts`）と店頭の動的QR決済
（`src/lib/paypay.ts`）の両方がこの中継を通る。** 店頭QRは当初Vercelから公式Node SDKで直接
PayPayを呼んでいたが、本番ではIP制限で必ず失敗するため2026-08に中継経由へ統一した。

Vercel側はPayPayの認証情報を一切持たず、この中継スクリプトを共有シークレット
（`X-Relay-Secret` ヘッダー）だけで呼び出す。サンドボックス/本番の切り替えは
Xserver側 `config.php` の `PAYPAY_ENV` だけで行う。

## 1. 設置手順

**先に注意（重要）**: `mosscountry.com` のDNSは**Vercelを向いている**。したがって
`https://mosscountry.com/...` にアクセスしてもXserverには一切届かない（Vercelが403を返す）。
Xserver上の `mosscountry.com/public_html/` にファイルを置いても、そのドメインでは公開されない。

中継スクリプトは**Xserverを向いているホスト名**の公開ディレクトリに置くこと。おすすめは
**Xserverの初期ドメイン（`<アカウントID>.xsrv.jp`）**で、DNS変更が不要。サブドメイン
（例: `relay.mosscountry.com`）をXserverに向けてもよいが、その場合はDNSのAレコード追加が必要。

どのホスト名を使ってもPayPayのIP制限には影響しない（PayPayが見るのはXserverからの
**送信元IP**であり、アクセスに使うホスト名とは無関係のため）。

1. Xserverのサーバーパネル（またはFTPクライアント）で、**Xserverを向いているドメインの**
   公開ディレクトリ（例: `/home/<アカウント>/<アカウントID>.xsrv.jp/public_html/`）配下に
   任意のサブディレクトリを作成する
   （例: `public_html/paypay-relay/`。URLに推測されにくい名前を付けることを推奨）。
2. このディレクトリに `paypay-relay.php` をアップロードする（ファイルマネージャーの
   「アップロード」機能、または FTP/SFTP クライアントでそのまま転送すればよい。ビルドや
   `composer install` は不要）。
3. 同じディレクトリに `config.php` を新規作成し、下記のサンプルを参考に実際の値を設定する
   （このファイルは絶対にGitにコミットしない。リポジトリの `.gitignore` に
   `xserver-relay/config.php` を追加済み）。

### config.php サンプル

```php
<?php
// PayPay for Business（開発者向けダッシュボード）で発行するAPIキー・シークレット・加盟店ID
define('PAYPAY_API_KEY', 'your-paypay-api-key');
define('PAYPAY_API_SECRET', 'your-paypay-api-secret');
define('PAYPAY_MERCHANT_ID', 'your-paypay-merchant-id');

// 'STAGING'（動作確認用） または 'PROD'（本番）
define('PAYPAY_ENV', 'STAGING');

// Vercel側（PAYPAY_RELAY_SECRET環境変数）と同じ値にすること。
// `openssl rand -base64 32` 等で生成したランダムな文字列を推奨。
define('RELAY_SHARED_SECRET', 'generate-a-long-random-shared-secret');
```

4. Vercel側の環境変数に以下を設定する（Vercelプロジェクト設定 > Environment Variables）。
   - `PAYPAY_RELAY_URL` = `https://<Xserverを向いているホスト名>/paypay-relay/paypay-relay.php`
     （例: `https://<アカウントID>.xsrv.jp/paypay-relay/paypay-relay.php`。手順1で作成した
     ディレクトリ名に合わせる。**mosscountry.com はVercelを向いているので使えない**）
   - `PAYPAY_RELAY_SECRET` = 上記 `RELAY_SHARED_SECRET` と同じ値
   - `NEXT_PUBLIC_PAYPAY_ENABLED` = `true`（チェックアウトにPayPayを表示する場合のみ）

## 2. PHPバージョン要件

- PHP 7.4以上（推奨: PHP 8.1以上。Xserverのサーバーパネル「PHP Ver.切替」で変更可能）
- 拡張モジュール: `curl`、`json`（いずれもXserverの標準構成で有効）。`mbstring` は
  あれば使うが、無い場合もPCREのUTF-8モードで代替するため必須ではない。
- 追加のライブラリ・Composerパッケージは不要（単一ファイルで完結）

## 3. エンドポイント仕様

いずれも `X-Relay-Secret` ヘッダーが `config.php` の `RELAY_SHARED_SECRET` と一致しない場合は
403を返す。

### `POST /paypay-relay.php?action=create`

PayPay QRCodeCreateを呼び出し、支払いURL・QRコードを発行する。
`redirectUrl` を**指定した場合はEC用**（`redirectType: WEB_LINK` を付ける）、
**省略した場合は店頭用の金額付き動的QR**（戻り先が無いため `redirectUrl` / `redirectType` を送らない）。

リクエストボディ（JSON）:
```json
{
  "merchantPaymentId": "MOS-1234567890-ABCDE1234",
  "amount": 5500,
  "orderDescription": "MOSS COUNTRY Order MOS-...",
  "orderItems": [
    { "name": "商品名", "quantity": 1, "unitPriceJpy": 5500 }
  ],
  "redirectUrl": "https://mosscountry.com/payment/paypay/return?order=MOS-..."
}
```

必須は `merchantPaymentId` と `amount` のみ。レスポンス: PayPay APIのレスポンス
（`resultInfo` / `data.url` など）をそのまま返す。

### `GET /paypay-relay.php?action=status&merchantPaymentId=...`

PayPay GetCodePaymentDetailsを呼び出し、決済状況を取得する。レスポンスはそのまま返す。

### `POST /paypay-relay.php?action=refund`

PayPay PaymentRefundを呼び出す。

リクエストボディ（JSON）:
```json
{
  "merchantRefundId": "uuid-v4",
  "paymentId": "PayPayの決済ID（GetCodePaymentDetailsで取得したpaymentId）",
  "amount": 5500
}
```

レスポンス: PayPay APIのレスポンスをそのまま返す。

### `POST /paypay-relay.php?action=delete`

PayPay QRCodeDelete（`DELETE /v2/codes/{codeId}`）を呼び出し、未決済のQRを削除する。
店頭会計の取り消しで使う。

リクエストボディ（JSON）:
```json
{ "codeId": "QRCodeCreateが返したcodeId" }
```

レスポンス: PayPay APIのレスポンスをそのまま返す（支払い済みの場合は
`DYNAMIC_QR_ALREADY_PAID` 等が `resultInfo` に入る）。

## 4. 疎通確認方法

実際にPayPayへ課金・返金を発生させずに段階的に確認できる。

1. **中継スクリプトが動作しているか（認証チェックの確認）**
   ```bash
   curl -i "https://<Xserverを向いているホスト名>/paypay-relay/paypay-relay.php?action=status&merchantPaymentId=test"
   ```
   `X-Relay-Secret` ヘッダーを付けていないため、**`403 Forbidden` が返れば設置は成功**
   （config.php の読み込み・シークレット照合まで正しく動いている）。

2. **共有シークレットが一致しているか**
   ```bash
   curl -i "https://<Xserverを向いているホスト名>/paypay-relay/paypay-relay.php?action=unknown" \
     -H "X-Relay-Secret: <RELAY_SHARED_SECRETの値>"
   ```
   シークレットが正しければ `400 Bad Request`（`Unknown action`）が返る。ここで403のままなら
   Vercel側と `config.php` の値が一致していないので確認する。

3. **PayPay STAGING環境への実疎通確認**
   `PAYPAY_ENV=STAGING` の状態で、少額（例: 1円）のテスト注文を実際にチェックアウトから作成し、
   `data.url` が発行されPayPayアプリ（またはSTAGING用テストアプリ）へリダイレクトされることを
   確認する。PayPay for BusinessのSTAGING（サンドボックス）用テストアカウントが必要。

4. **本番切り替え**
   PayPayの加盟店審査が完了し本番APIキーを払い出されたら、`config.php` の
   `PAYPAY_API_KEY` / `PAYPAY_API_SECRET` / `PAYPAY_MERCHANT_ID` を本番用に差し替え、
   `PAYPAY_ENV` を `PROD` に変更する。**この1か所でEC・店頭QRの両方が本番に切り替わる。**

   切り替える前に、**PayPayに登録済みの接続元IPがXserverの実際の送信元IPと一致しているか**を
   必ず確認する（不一致だと全APIが `UNAUTHORIZED(08100016)` で失敗する）。送信元IPは
   `<?php echo file_get_contents('https://api.ipify.org');` だけのPHPファイルをXserverに置いて
   ブラウザで開けば確認できる。登録IPの追加・変更はPayPayへの申請が必要で、**反映まで最大4日**
   かかるため最初に着手すること。

## 5. HMAC-Auth実装について（重要）

`paypay-relay.php` 内のHMAC署名生成は、PayPay公式ドキュメントを独自解釈したものではなく、
公式Node SDK `@paypayopa/paypayopa-sdk-node`（v2.2.0）の `createAuthHeader()` 実装
（`dist/lib/paypay-rest-sdk.js`）をPHPに移植したもの。移植元のSDKは、当時このリポジトリの
店頭QR決済で実際に動作していたものである（店頭QRも中継経由に統一したため、SDK自体は
2026-08に依存関係から削除した）。各ステップの詳細は `paypay-relay.php` 冒頭のコメントを参照。

**要注意（推測を含む・要検証の箇所）**:

- **APIベースURL**: 公式ドキュメントの記載は `stg-api.sandbox.paypay.ne.jp` /
  `api.paypay.ne.jp`系だが、本ファイルは公式Node SDKが実際に接続しているホスト名
  `apigw.sandbox.paypay.ne.jp`（STAGING） / `apigw.paypay.ne.jp`（PROD）を採用した
  （このリポジトリの店頭QR決済で実績があるため）。もし疎通確認で接続できない場合は、
  PayPay for Businessの管理画面や最新の公式ドキュメントでホスト名を再確認すること。
- **merchantPaymentId / merchantRefundId の文字種・長さ制限**: 強制的なバリデーションは
  実装していない。PayPayが不正な値を拒否した場合はエラーレスポンスがそのまま返るため、
  Vercel側のログで検知できる。

## 6. トラブルシューティング

- **403が返り、レスポンスヘッダーに `Server: Vercel` がある**: 中継ではなくVercelに
  アクセスしている。`PAYPAY_RELAY_URL` のホスト名がVercelを向いているドメイン
  （`mosscountry.com`）になっているのが原因。Xserverを向いているホスト名に直す（手順1の注意参照）。
- **403が常に返る（`Server: Vercel` ではない）**: `config.php` の `RELAY_SHARED_SECRET` とVercelの
  `PAYPAY_RELAY_SECRET` が一致しているか確認する。
- **PayPay APIから `UNAUTHORIZED` 系のエラーが返る**: `PAYPAY_API_KEY` /
  `PAYPAY_API_SECRET` / `PAYPAY_MERCHANT_ID` の設定、および固定IPがPayPay for Business側に
  正しく登録されているかを確認する。
- **`curl拡張が有効化されていません` エラー**: Xserverのサーバーパネルで対象ドメインの
  PHP設定を確認し、PHPバージョンを標準構成のものに変更する（`curl`拡張は標準で有効）。
