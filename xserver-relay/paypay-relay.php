<?php
/**
 * MOSS COUNTRY - PayPay ウェブ決済 中継スクリプト（Xserver固定IP経由）
 * ============================================================================
 * PayPay本番APIは「PayPay for Businessに登録した固定IPからのみ」アクセスを許可する。
 * Vercel(サーバレス)はIPが固定できないため、固定IPを持つXserver（本ファイルの設置先）を
 * 中継点にし、PayPayから見た送信元IPを常にこのXserverのものにする。
 *
 * Vercel側はこの中継スクリプトを共有シークレット（X-Relay-Secretヘッダー）で呼ぶだけで、
 * PayPayのAPIキー等の認証情報は一切Vercel側に置かない（Xserver側のconfig.phpにのみ保持）。
 *
 * 依存パッケージ無し・単一ファイルで完結（Composer等不要）。Xserverに
 * このファイルと config.php（README.md参照）をアップロードするだけで動作する。
 *
 * 対応エンドポイント（?action= で分岐）:
 *   - action=create (POST) : PayPay QRCodeCreate（redirectUrl指定時はWeb決済用リダイレクト付き、
 *                            未指定時は店頭用の金額付き動的QR）
 *   - action=status (GET)  : PayPay GetCodePaymentDetails（決済状況取得）
 *   - action=refund (POST) : PayPay PaymentRefund（返金）
 *   - action=delete (POST) : PayPay QRCodeDelete（未決済QRの削除）
 *
 * EC決済（src/lib/paypayWebClient.ts）と店頭QR決済（src/lib/paypay.ts）の両方がこの中継を使う。
 * 店頭QRも本番ではIP制限を受けるため、Vercelから直接PayPayを呼ぶ経路は存在しない。
 *
 * HMAC-Auth（PayPay OPA API認証）の実装について
 * ----------------------------------------------------------------------------
 * 重要: 本ファイルの署名アルゴリズムは、PayPay公式ドキュメントを推測で実装したものではなく、
 * かつてこのリポジトリの店頭QR決済（src/lib/paypay.ts）で実際に動作していた
 * 公式Node SDK「@paypayopa/paypayopa-sdk-node」v2.2.0 の実装（
 * dist/lib/paypay-rest-sdk.js の
 * createAuthHeader() ）をそのままPHPに移植したものである。したがって細部（ヘッダーの
 * 1つ目がmerchantIdではなくAPIキーであること等）まで実際に動作しているコードに基づく。
 *
 * 署名手順（createAuthHeader()の移植）:
 *   1. epoch = 現在時刻のUNIX秒、nonce = ランダムなUUID v4
 *   2. リクエストボディがある場合（POST）は、ボディに requestedAt（UNIX秒）を追加してから
 *      JSON文字列化する。これは公式SDKが実際に行っている処理であり、省略するとPayPay側の
 *      署名検証に失敗する（=このリレー特有の実装ではなく、公式SDKの必須仕様）。
 *   3. contentType / payloadDigest（contentHash）を決定する:
 *        - ボディが無い場合（GET/DELETE）      : contentType = "empty", payloadDigest = "empty"
 *        - ボディがある場合（POST、JSON文字列化 済み）:
 *            contentType = "application/json"
 *            payloadDigest = base64( md5_raw(contentType . jsonBody) )
 *          （公式SDKは CryptoJS の algo.MD5.create().update(contentType).update(jsonBody).finalize()
 *            を使っており、これは MD5(contentType . jsonBody) の生バイト列と等価）
 *   4. 署名対象文字列 = [path, method, nonce, epoch, contentType, payloadDigest] を
 *      "\n" で連結したもの（pathはクエリ文字列を含まない）
 *   5. signature = base64( HMAC-SHA256(署名対象文字列, APIシークレット) )
 *   6. Authorization ヘッダー値 =
 *        "hmac OPA-Auth:{APIキー}:{signature}:{nonce}:{epoch}:{payloadDigest}"
 *      （公式SDKのヘッダー1つ目は「APIキー」であり「マーチャントID」ではない。
 *        マーチャントIDは別ヘッダー X-ASSUME-MERCHANT として渡す）
 *
 * 【要注意・推測を含む箇所】(README.mdにも記載。実運用前に必ずPayPay本番/STAGINGで疎通確認すること)
 *   - PayPay APIのベースURL: 公式ドキュメント上の記載は STAGING=https://stg-api.sandbox.paypay.ne.jp /
 *     PROD=https://api.paypay.ne.jp とされることが多いが、上記の公式Node SDK
 *     （dist/lib/environments.js）が実際に接続しているホストは
 *       PROD    = apigw.paypay.ne.jp
 *       STAGING = apigw.sandbox.paypay.ne.jp
 *     である。本ファイルはSDKが実際に接続しているホストを正として採用した（下記 PAYPAY_API_HOSTS）。
 *     なお2026-08時点の公式ドキュメント（Dynamic QR Code）でも本番は apigw.paypay.ne.jp が
 *     現行、api.paypay.ne.jp は非推奨と記載されており、この採用と一致している。
 *   - merchantPaymentId / merchantRefundId の文字種・長さ制限（PayPay公式仕様では英数字と
 *     ハイフン/アンダースコアで64文字以内とされることが多い）はこのファイルでは強制検証していない。
 *     このリポジトリの注文番号形式（`MOS-<timestamp>-<英数字9桁>`）は条件を満たす想定だが、
 *     万一PayPay側で拒否された場合はエラーレスポンスがそのままVercel側に返るので、そこで検知できる。
 */

declare(strict_types=1);

// ---- 本番運用向けのエラー表示設定 ----
// PHPの警告等をレスポンスに出力させない（生の内部エラーを外部に漏らさないため）。
// ログには残す（Xserverのエラーログで調査できるように）。
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// PayPayの実ホスト（公式SDK実装に準拠。コメント参照）
const PAYPAY_API_HOSTS = [
    'PROD' => 'apigw.paypay.ne.jp',
    'STAGING' => 'apigw.sandbox.paypay.ne.jp',
];

/**
 * JSONで即レスポンスして終了する。
 */
function paypay_relay_respond(int $status, array $data): void
{
    http_response_code($status > 0 ? $status : 502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * リクエストボディ(JSON)を連想配列として読み取る。不正/空の場合は空配列を返す。
 */
function paypay_relay_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * ランダムなUUID v4を生成する（PayPay署名のnonceに使用）。
 */
function paypay_relay_uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant 10
    $hex = bin2hex($data);
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

/**
 * UTF-8文字列を文字数で切り詰める（PayPayの品名長制限用）。
 * mbstringが有効でない環境でも動くよう、mb_substrが無い場合はPCREのUTF-8モードで代替する
 * （bytes単位のsubstrだと日本語の途中で切れて不正なUTF-8になり、PayPayに弾かれるため）。
 */
function paypay_relay_truncate(string $text, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $limit);
    }
    if (preg_match('/^.{0,' . $limit . '}/us', $text, $matches) === 1) {
        return $matches[0];
    }
    return substr($text, 0, $limit);
}

/**
 * PayPay OPA APIのHMAC認証ヘッダーと、実際に送信するJSON文字列（POSTのみ）を生成する。
 *
 * @param string     $method         'GET' | 'POST' | 'DELETE'
 * @param string     $path           クエリ文字列を含まないAPIパス（例: /v2/codes）
 * @param array|null $bodyForSigning POST時のボディ（連想配列）。GET/DELETEはnull。
 * @return array{0: string, 1: ?string} [Authorizationヘッダー値, 送信用JSON文字列(POST時のみ、それ以外null)]
 */
function paypay_relay_build_auth(string $method, string $path, ?array $bodyForSigning, string $apiKey, string $apiSecret): array
{
    $epoch = time();
    $nonce = paypay_relay_uuid_v4();

    if ($bodyForSigning === null) {
        // GET/DELETEなど本文が無いリクエスト
        $contentType = 'empty';
        $payloadDigest = 'empty';
        $jsonBody = null;
    } else {
        // POST: 公式SDKと同様、実際に送信するボディに requestedAt を含めた上でJSON化し、
        // そのJSON文字列全体を署名対象・送信内容の両方に使う（署名と送信内容を必ず一致させる）
        $bodyForSigning['requestedAt'] = time();
        $contentType = 'application/json';
        $jsonBody = json_encode($bodyForSigning, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        // payloadDigest = base64(MD5(contentType . jsonBody)) の生ダイジェスト
        $payloadDigest = base64_encode(md5($contentType . $jsonBody, true));
    }

    $signatureRawData = implode("\n", [$path, $method, $nonce, (string) $epoch, $contentType, $payloadDigest]);
    $signature = base64_encode(hash_hmac('sha256', $signatureRawData, $apiSecret, true));

    $authHeader = 'hmac OPA-Auth:' . implode(':', [$apiKey, $signature, $nonce, (string) $epoch, $payloadDigest]);

    return [$authHeader, $jsonBody];
}

/**
 * PayPay APIへHTTPS経由でリクエストを送り、[HTTPステータス, レスポンス連想配列] を返す。
 */
function paypay_relay_call(
    string $method,
    string $path,
    ?array $bodyForSigning,
    string $baseUrl,
    string $apiKey,
    string $apiSecret,
    string $merchantId
): array {
    if (!extension_loaded('curl')) {
        return [500, ['error' => 'サーバーにPHPのcurl拡張が有効化されていません。Xserverのサーバーパネルで有効化してください。']];
    }

    [$authHeader, $jsonBody] = paypay_relay_build_auth($method, $path, $bodyForSigning, $apiKey, $apiSecret);

    $headers = [
        'Authorization: ' . $authHeader,
        // マーチャントID（サブマーチャント等を想定した公式SDKの仕様に合わせ、常に付与する）
        'X-ASSUME-MERCHANT: ' . $merchantId,
    ];
    if ($jsonBody !== null) {
        $headers[] = 'Content-Type: application/json';
        $headers[] = 'Content-Length: ' . strlen($jsonBody);
    }

    $ch = curl_init($baseUrl . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if ($jsonBody !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
    }

    $responseBody = curl_exec($ch);
    if ($responseBody === false) {
        $curlError = curl_error($ch);
        curl_close($ch);
        return [502, ['error' => 'PayPay APIへの接続に失敗しました', 'detail' => $curlError]];
    }
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        return [$status ?: 502, ['error' => 'PayPay APIのレスポンスをJSONとして解析できませんでした', 'raw' => $responseBody]];
    }

    return [$status, $decoded];
}

// ============================================================================
// エントリーポイント
// ============================================================================
try {
    // ---- config.php 読み込み ----
    // PAYPAY_API_KEY / PAYPAY_API_SECRET / PAYPAY_MERCHANT_ID / PAYPAY_ENV / RELAY_SHARED_SECRET
    // を定義したファイル。認証情報を含むためgitignore対象（README.md参照）。
    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        paypay_relay_respond(500, [
            'error' => 'config.php が見つかりません。README.md の手順に従って同じディレクトリに作成してください。',
        ]);
    }
    require $configPath;

    foreach (['PAYPAY_API_KEY', 'PAYPAY_API_SECRET', 'PAYPAY_MERCHANT_ID', 'PAYPAY_ENV', 'RELAY_SHARED_SECRET'] as $requiredConst) {
        if (!defined($requiredConst) || constant($requiredConst) === '') {
            paypay_relay_respond(500, ['error' => "config.php に {$requiredConst} が設定されていません"]);
        }
    }

    // ---- 共有シークレットによる呼び出し元認証 ----
    // Vercel側（src/lib/paypayWebClient.ts）は X-Relay-Secret ヘッダーにこの値を付けて呼ぶ。
    // ヘッダー欠落・不一致はいずれも403（タイミング攻撃対策で hash_equals を使用）。
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $providedSecret = '';
    foreach ($headers as $name => $value) {
        if (strcasecmp($name, 'X-Relay-Secret') === 0) {
            $providedSecret = (string) $value;
            break;
        }
    }
    // getallheaders() が使えない実行環境（PHP-CGI等）向けのフォールバック
    if ($providedSecret === '' && isset($_SERVER['HTTP_X_RELAY_SECRET'])) {
        $providedSecret = (string) $_SERVER['HTTP_X_RELAY_SECRET'];
    }
    if ($providedSecret === '' || !hash_equals((string) RELAY_SHARED_SECRET, $providedSecret)) {
        paypay_relay_respond(403, ['error' => 'Forbidden: X-Relay-Secret header missing or invalid']);
    }

    $env = (PAYPAY_ENV === 'PROD') ? 'PROD' : 'STAGING';
    $baseUrl = 'https://' . PAYPAY_API_HOSTS[$env];

    $action = isset($_GET['action']) ? (string) $_GET['action'] : '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    switch ($action) {
        // --------------------------------------------------------------
        // action=create : PayPay QRCodeCreate
        //   redirectUrl あり = EC（ウェブ決済用リダイレクト付き）
        //   redirectUrl なし = 店頭の金額付き動的QR（お客様が店頭でスキャンするため戻り先が無い）
        // --------------------------------------------------------------
        case 'create': {
            if ($method !== 'POST') {
                paypay_relay_respond(405, ['error' => 'action=create にはPOSTを使用してください']);
            }
            $input = paypay_relay_read_json_body();

            $merchantPaymentId = isset($input['merchantPaymentId']) ? (string) $input['merchantPaymentId'] : '';
            $amount = isset($input['amount']) ? (float) $input['amount'] : 0;
            $redirectUrl = isset($input['redirectUrl']) ? (string) $input['redirectUrl'] : '';

            if ($merchantPaymentId === '' || $amount <= 0) {
                paypay_relay_respond(400, ['error' => 'merchantPaymentId, amount は必須です']);
            }

            $payload = [
                'merchantPaymentId' => $merchantPaymentId,
                'amount' => [
                    'amount' => (int) round($amount),
                    'currency' => 'JPY',
                ],
                'codeType' => 'ORDER_QR',
                'isAuthorization' => false,
            ];

            // 店頭QR（redirectUrl未指定）では redirectUrl / redirectType を送らない。
            // PayPayは redirectType を指定した場合 redirectUrl を必須とするため、必ず対で付ける。
            if ($redirectUrl !== '') {
                $payload['redirectUrl'] = $redirectUrl;
                $payload['redirectType'] = 'WEB_LINK';
            }

            if (!empty($input['orderDescription'])) {
                $payload['orderDescription'] = (string) $input['orderDescription'];
            }

            if (!empty($input['orderItems']) && is_array($input['orderItems'])) {
                $orderItems = [];
                foreach ($input['orderItems'] as $item) {
                    if (!is_array($item)) {
                        continue;
                    }
                    $orderItems[] = [
                        // PayPayの品名は長すぎると弾かれるため30文字に丸める（EC・店頭とも共通）
                        'name' => paypay_relay_truncate((string) ($item['name'] ?? ''), 30),
                        'quantity' => (int) ($item['quantity'] ?? 1),
                        'unitPrice' => [
                            'amount' => (int) round((float) ($item['unitPriceJpy'] ?? 0)),
                            'currency' => 'JPY',
                        ],
                    ];
                }
                if (!empty($orderItems)) {
                    $payload['orderItems'] = $orderItems;
                }
            }

            [$status, $data] = paypay_relay_call('POST', '/v2/codes', $payload, $baseUrl, PAYPAY_API_KEY, PAYPAY_API_SECRET, PAYPAY_MERCHANT_ID);
            paypay_relay_respond($status, $data);
            break;
        }

        // --------------------------------------------------------------
        // action=status : PayPay GetCodePaymentDetails（決済状況取得）
        // --------------------------------------------------------------
        case 'status': {
            if ($method !== 'GET') {
                paypay_relay_respond(405, ['error' => 'action=status にはGETを使用してください']);
            }
            $merchantPaymentId = isset($_GET['merchantPaymentId']) ? (string) $_GET['merchantPaymentId'] : '';
            if ($merchantPaymentId === '') {
                paypay_relay_respond(400, ['error' => 'merchantPaymentId は必須です']);
            }

            // IDはURLパスに埋め込むため必ずエンコードする（スラッシュ等によるパス改変を防ぐ）。
            // 署名対象のpathと実際に送信するpathを同一にするため、エンコード後の値を使う。
            $path = '/v2/codes/payments/' . rawurlencode($merchantPaymentId);
            [$status, $data] = paypay_relay_call('GET', $path, null, $baseUrl, PAYPAY_API_KEY, PAYPAY_API_SECRET, PAYPAY_MERCHANT_ID);
            paypay_relay_respond($status, $data);
            break;
        }

        // --------------------------------------------------------------
        // action=refund : PayPay PaymentRefund（返金）
        // --------------------------------------------------------------
        case 'refund': {
            if ($method !== 'POST') {
                paypay_relay_respond(405, ['error' => 'action=refund にはPOSTを使用してください']);
            }
            $input = paypay_relay_read_json_body();

            $merchantRefundId = isset($input['merchantRefundId']) ? (string) $input['merchantRefundId'] : '';
            $paymentId = isset($input['paymentId']) ? (string) $input['paymentId'] : '';
            $amount = isset($input['amount']) ? (float) $input['amount'] : 0;

            if ($merchantRefundId === '' || $paymentId === '' || $amount <= 0) {
                paypay_relay_respond(400, ['error' => 'merchantRefundId, paymentId, amount は必須です']);
            }

            $payload = [
                'merchantRefundId' => $merchantRefundId,
                'paymentId' => $paymentId,
                'amount' => [
                    'amount' => (int) round($amount),
                    'currency' => 'JPY',
                ],
            ];

            [$status, $data] = paypay_relay_call('POST', '/v2/refunds', $payload, $baseUrl, PAYPAY_API_KEY, PAYPAY_API_SECRET, PAYPAY_MERCHANT_ID);
            paypay_relay_respond($status, $data);
            break;
        }

        // --------------------------------------------------------------
        // action=delete : PayPay QRCodeDelete（未決済QRの削除。店頭会計の取り消しで使う）
        // PayPay側は DELETE /v2/codes/{codeId} だが、Vercel側からの呼び出しは他アクションと
        // 揃えてPOST + JSONボディで受ける。
        // --------------------------------------------------------------
        case 'delete': {
            if ($method !== 'POST') {
                paypay_relay_respond(405, ['error' => 'action=delete にはPOSTを使用してください']);
            }
            $input = paypay_relay_read_json_body();

            $codeId = isset($input['codeId']) ? (string) $input['codeId'] : '';
            if ($codeId === '') {
                paypay_relay_respond(400, ['error' => 'codeId は必須です']);
            }

            $path = '/v2/codes/' . rawurlencode($codeId);
            [$status, $data] = paypay_relay_call('DELETE', $path, null, $baseUrl, PAYPAY_API_KEY, PAYPAY_API_SECRET, PAYPAY_MERCHANT_ID);
            paypay_relay_respond($status, $data);
            break;
        }

        default:
            paypay_relay_respond(400, ['error' => 'Unknown action. Use ?action=create|status|refund|delete']);
    }
} catch (Throwable $e) {
    error_log('[paypay-relay] Unhandled error: ' . $e->getMessage());
    paypay_relay_respond(500, ['error' => 'Internal relay error', 'message' => $e->getMessage()]);
}
