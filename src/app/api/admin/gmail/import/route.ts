// じゃらん予約メールの取込みを実行する。
//
// 既定は試し実行（dryRun）。台帳を実際に書き換えるには apply: true を明示的に渡す必要がある。
// 過去メールが多く、誤って全件流し込むと戻せないため、既定を安全側にしている。

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { runJalanImport } from '@/lib/jalanImportRunner';
import { parsePositiveInt } from '@/lib/requestParams';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const apply = body?.apply === true;
    const summary = await runJalanImport({
      dryRun: !apply,
      sinceDays: body?.sinceDays === undefined ? undefined : parsePositiveInt(body.sinceDays, 90),
      maxMessages: body?.maxMessages === undefined ? undefined : parsePositiveInt(body.maxMessages, 100),
    });

    if (apply) {
      console.log('じゃらん取込みを実行しました', {
        by: session.email,
        created: summary.created,
        confirmed: summary.confirmed,
        cancelled: summary.cancelled,
      });
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Jalan import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
