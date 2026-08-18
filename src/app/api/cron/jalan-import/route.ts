// じゃらん予約メールの自動取込み（Vercel Cronから1日1回呼ばれる）。
//
// /api/admin/ 配下に置くと middleware の管理者セッション判定に引っかかるため、
// /api/cron/ に置いて CRON_SECRET による認証を自前で行う。
//
// Vercel Cron は CRON_SECRET 環境変数が設定されていると
// Authorization: Bearer <CRON_SECRET> を付けて呼び出す。
// CRON_SECRET が未設定の場合はこのエンドポイントを動かさない（誰でも叩けてしまうため）。

import { NextRequest, NextResponse } from 'next/server';
import { runJalanImport } from '@/lib/jalanImportRunner';

/** Gmail・Supabase・カレンダーを順に叩くため、既定の10秒では足りない */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('CRON_SECRET が未設定のため、じゃらん自動取込みを実行しませんでした');
    return NextResponse.json(
      { error: 'CRON_SECRET が設定されていません' },
      { status: 503 }
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    // 自動実行では試し実行をせず、そのまま反映する。
    // 判断ロジックは冪等（同じメールを何度読んでも二重登録しない）なので、
    // 毎日同じ範囲を読み直しても問題ない。
    const summary = await runJalanImport({ dryRun: false });

    console.log('じゃらん自動取込みを実行しました', {
      scanned: summary.scanned,
      created: summary.created,
      confirmed: summary.confirmed,
      cancelled: summary.cancelled,
      skipped: summary.skipped,
      failed: summary.failed,
    });

    return NextResponse.json({
      ok: true,
      created: summary.created,
      confirmed: summary.confirmed,
      cancelled: summary.cancelled,
      skipped: summary.skipped,
      failed: summary.failed,
    });
  } catch (error) {
    // Gmailのトークン失効（Testing状態では7日で切れる）もここに来る。
    // ログに残し、管理画面の連携状態から気付けるようにする。
    console.error('じゃらん自動取込みに失敗しました:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取込みに失敗しました' },
      { status: 500 }
    );
  }
}
