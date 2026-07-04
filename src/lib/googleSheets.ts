// Googleスプレッドシートへの日別売上バックアップ同期
// 「バックアップ用」の位置づけのため、失敗しても保存処理自体は止めない（ベストエフォート）。
// 環境変数（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY /
// GOOGLE_SHEETS_SPREADSHEET_ID）が設定されていない場合は何もしない。

const SHEET_NAME = '日別売上';
const HEADER_ROW = [
  '日付', '来店者数', '購入組数',
  'コケ小計', '商品小計', 'フィギュア小計', 'ワークショップ小計', 'ガチャ小計', 'その他小計',
  '現金', 'PayPay', 'カード（手入力）', 'EC売上', '店頭QR決済', '総売上',
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
async function ensureSheetExists(sheets: any, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetExists = meta.data.sheets?.some((s: any) => s.properties?.title === SHEET_NAME);

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
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

    await ensureSheetExists(sheets, spreadsheetId);

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:A`,
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
        range: `${SHEET_NAME}!A${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [values] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A:A`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      });
    }
  } catch (error) {
    console.error('Googleスプレッドシート同期エラー（バックアップのみのため保存処理は継続します）:', error);
  }
}
