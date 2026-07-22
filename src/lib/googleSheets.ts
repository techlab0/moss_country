// Googleスプレッドシートへの売上バックアップ同期
// 「バックアップ用」の位置づけのため、失敗しても保存処理自体は止めない（ベストエフォート）。
// 環境変数（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY /
// GOOGLE_SHEETS_SPREADSHEET_ID）が設定されていない場合は何もしない。
//
// 2タブ構成:
// - 日別売上（DAILY_SHEET_NAME）: 1日1行のサマリー
// - 取引明細（TX_SHEET_NAME）: EC注文・店頭QR/POS/PayPay決済・手入力取引の1件1行ログ

const DAILY_SHEET_NAME = '日別売上';
const DAILY_HEADER_ROW = [
  '日付', '来店者数', '購入組数',
  'コケ小計', '商品小計', 'フィギュア小計', 'ワークショップ小計', 'ガチャ小計', 'その他小計',
  '現金', 'PayPay', 'カード（手入力）', 'EC売上', '店頭QR決済', '総売上',
];

const TX_SHEET_NAME = '取引明細';
const TX_HEADER_ROW = [
  '日時', '種別', '取引ID', '顧客名', '顧客メール', '決済方法', '商品明細',
  '小計', '送料', '税', '合計', 'ステータス', '更新日時',
];

function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
}

export interface DailySalesSheetRow {
  date: string;
  visitorCount: number;
  purchaseGroupCount: number;
  categorySubtotals: Record<string, number>; // moss, product, figure, workshop, gacha, other
  cashAmount: number;
  payPayAmount: number;
  manualCardAmount: number;
  ecTotal: number;
  qrChargeTotal: number;
  grandTotal: number;
}

// 取引明細シートの1行分。EC注文・店頭QR/POS/PayPay決済・手入力取引の3ソース共通のフォーマット。
export interface TransactionSheetRow {
  datetime: string; // 日時（JST表示。取引発生日時）
  type: string; // 種別（EC注文 / 店頭QR/POS / 手入力）
  txId: string; // 取引ID（ソース間の衝突を避けるためプレフィックス付き。EC=注文番号そのまま）
  customerName: string; // 顧客名（店頭・手入力は空）
  customerEmail: string; // 顧客メール（店頭・手入力は空）
  paymentMethod: string; // 決済方法ラベル
  itemsSummary: string; // 商品明細（「名前×数量、…」で連結）
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string; // ステータスラベル（支払い済み/入金待ち/キャンセル/返金済み）
  updatedAt: string; // このシート行を書いた時刻（JST表示）
}

async function getSheetsClient() {
  const { google } = await import('googleapis');
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSheetExists(sheets: any, spreadsheetId: string, sheetName: string, headerRow: string[]) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetExists = meta.data.sheets?.some((s: any) => s.properties?.title === sheetName);

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headerRow] },
    });
  }
}

/**
 * 日別売上の1日分をGoogleスプレッドシートへUPSERT（日付列で検索し、あれば更新、なければ追記）する。
 * 失敗してもエラーをログに残すのみで、呼び出し元には伝播させない。
 */
export async function syncDailySalesToSheet(row: DailySalesSheetRow): Promise<void> {
  if (!isConfigured()) {
    return;
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    await ensureSheetExists(sheets, spreadsheetId, DAILY_SHEET_NAME, DAILY_HEADER_ROW);

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${DAILY_SHEET_NAME}!A:A`,
    });
    const existingRows: string[][] = existing.data.values || [];
    const rowIndex = existingRows.findIndex(r => r[0] === row.date);

    const values = [
      row.date,
      row.visitorCount,
      row.purchaseGroupCount,
      row.categorySubtotals.moss || 0,
      row.categorySubtotals.product || 0,
      row.categorySubtotals.figure || 0,
      row.categorySubtotals.workshop || 0,
      row.categorySubtotals.gacha || 0,
      row.categorySubtotals.other || 0,
      row.cashAmount,
      row.payPayAmount,
      row.manualCardAmount,
      row.ecTotal,
      row.qrChargeTotal,
      row.grandTotal,
    ];

    if (rowIndex > 0) {
      // ヘッダー行(インデックス0)を除いた既存行を更新。スプレッドシートの行番号は1始まりなので +1。
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${DAILY_SHEET_NAME}!A${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [values] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${DAILY_SHEET_NAME}!A:A`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      });
    }
  } catch (error) {
    console.error('Googleスプレッドシート（日別売上）同期エラー（バックアップのみのため保存処理は継続します）:', error);
  }
}

function transactionRowValues(row: TransactionSheetRow): (string | number)[] {
  return [
    row.datetime,
    row.type,
    row.txId,
    row.customerName,
    row.customerEmail,
    row.paymentMethod,
    row.itemsSummary,
    row.subtotal,
    row.shipping,
    row.tax,
    row.total,
    row.status,
    row.updatedAt,
  ];
}

/**
 * 取引明細1件をGoogleスプレッドシートへUPSERT（取引ID列=C列で検索し、あれば更新、なければ追記）する。
 * EC注文・店頭QR/POS/PayPay決済・手入力取引のいずれからも呼ばれる想定。
 * 失敗してもエラーをログに残すのみで、呼び出し元には伝播させない（ベストエフォート、no-op含む）。
 */
export async function upsertTransactionRow(row: TransactionSheetRow): Promise<void> {
  if (!isConfigured()) {
    return;
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    await ensureSheetExists(sheets, spreadsheetId, TX_SHEET_NAME, TX_HEADER_ROW);

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TX_SHEET_NAME}!C:C`,
    });
    const existingRows: string[][] = existing.data.values || [];
    const rowIndex = existingRows.findIndex(r => r[0] === row.txId);

    const values = transactionRowValues(row);

    if (rowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TX_SHEET_NAME}!A${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [values] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TX_SHEET_NAME}!A:A`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      });
    }
  } catch (error) {
    console.error('Googleスプレッドシート（取引明細）同期エラー（バックアップのみのため処理は継続します）:', error);
  }
}

/**
 * 取引明細シートを全件書き換える（過去分の一括バックフィル用）。
 * 既存データをクリアしてからヘッダー+全行を1回のvalues.updateでまとめて書き込むため、
 * 行数が多くてもAPI呼び出しは数回で済む。
 * 失敗してもエラーをログに残すのみで、呼び出し元には伝播させない。
 */
export async function writeAllTransactions(rows: TransactionSheetRow[]): Promise<void> {
  if (!isConfigured()) {
    return;
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    await ensureSheetExists(sheets, spreadsheetId, TX_SHEET_NAME, TX_HEADER_ROW);

    // ヘッダー行含め13列（A〜M）分をクリアしてから書き直す
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${TX_SHEET_NAME}!A:M`,
    });

    const values = [TX_HEADER_ROW, ...rows.map(transactionRowValues)];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TX_SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Googleスプレッドシート（取引明細）一括書き込みエラー:', error);
  }
}
