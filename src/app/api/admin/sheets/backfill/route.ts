import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { collectAllTransactions, computeDailySalesSheetRow, listTransactionDates } from '@/lib/salesBackup';
import { writeAllTransactions, syncDailySalesToSheet } from '@/lib/googleSheets';

/**
 * 過去分の一括バックアップ（管理画面の売上ページから手動実行する想定）。
 * 1) 全期間の取引明細（EC注文・店頭QR/POS決済・手入力取引）を取引明細シートへ全書き込み
 * 2) 実際に取引がある全JST日付について日別サマリーを再計算し、日別売上シートへ同期
 * 時間がかかりうるため日別サマリーは順次処理する。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const transactionRows = await collectAllTransactions();
    await writeAllTransactions(transactionRows);

    const dates = await listTransactionDates();
    let dailySummarySyncedCount = 0;
    const failedDates: string[] = [];

    for (const date of dates) {
      try {
        const summary = await computeDailySalesSheetRow(date);
        await syncDailySalesToSheet(summary);
        dailySummarySyncedCount += 1;
      } catch (error) {
        console.error(`バックフィル: 日別サマリー同期に失敗しました (date: ${date}):`, error);
        failedDates.push(date);
      }
    }

    return NextResponse.json({
      transactionCount: transactionRows.length,
      dateCount: dates.length,
      dailySummarySyncedCount,
      failedDates,
    });
  } catch (error) {
    console.error('一括バックアップエラー:', error);
    const message = error instanceof Error ? error.message : '一括バックアップに失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
