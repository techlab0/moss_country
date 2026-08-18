import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/lib/auth';
import { isCalendarConfigured, getBusyIntervals, probeCalendarWriteAccess } from '@/lib/googleCalendar';
import { CAPACITY_PER_SLOT } from '@/lib/workshopBookingConfig';

// ワークショップ予約のGoogleカレンダー接続を診断する管理者用エンドポイント。
// 空き枠APIが503になる原因（環境変数未設定 / Calendar API未有効 / 共有ミス / カレンダーID誤り）を
// 実際のエラーメッセージから切り分けるために一時的に用意した。認証必須・機密値はマスクして返す。
function mask(value: string | undefined): string {
  if (!value) return '(未設定)';
  if (value.length <= 8) return `設定あり(${value.length}文字)`;
  return `${value.slice(0, 4)}…${value.slice(-6)}`;
}

/**
 * DBのトリガーが強制している定員と、コードの CAPACITY_PER_SLOT が一致しているかを確認する。
 *
 * 定員はコード（表示・事前チェック）とDBトリガー（最終保証）の2か所にあり、
 * 実際に片方だけ変更された事故が起きている（2026-08-05にコードだけ4→6へ変更され、
 * トリガーは4のまま残っていた）。食い違うと、画面上は「空きあり」なのに
 * 予約確定の瞬間だけ失敗し、お客様からは「空いているのに予約できない」ように見える。
 * 症状から原因にたどり着きにくいので、ここで機械的に検知できるようにする。
 */
async function checkCapacityConsistency(): Promise<{
  ok: boolean;
  code: number;
  database: number | null;
  message: string;
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.rpc('get_workshop_slot_capacity');

    if (error) {
      return {
        ok: false,
        code: CAPACITY_PER_SLOT,
        database: null,
        message: `DB側の定員を取得できませんでした（${error.message}）。docs/sql/fix-workshop-slot-capacity.sql を適用してください`,
      };
    }

    const database = typeof data === 'number' ? data : Number(data);
    if (!Number.isFinite(database)) {
      return {
        ok: false,
        code: CAPACITY_PER_SLOT,
        database: null,
        message: 'DB側の定員を数値として読み取れませんでした',
      };
    }

    if (database !== CAPACITY_PER_SLOT) {
      return {
        ok: false,
        code: CAPACITY_PER_SLOT,
        database,
        message: `定員が食い違っています（コード ${CAPACITY_PER_SLOT}名 / DB ${database}名）。${Math.min(database, CAPACITY_PER_SLOT) + 1}名以上の予約が確定時に失敗します`,
      };
    }

    return {
      ok: true,
      code: CAPACITY_PER_SLOT,
      database,
      message: `一致しています（${CAPACITY_PER_SLOT}名）`,
    };
  } catch (error) {
    return {
      ok: false,
      code: CAPACITY_PER_SLOT,
      database: null,
      message: error instanceof Error ? error.message : '定員の確認に失敗しました',
    };
  }
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const env = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: mask(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      ? `設定あり(${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length}文字)`
      : '(未設定)',
    GOOGLE_CALENDAR_ID: mask(process.env.GOOGLE_CALENDAR_ID),
    isCalendarConfigured: isCalendarConfigured(),
  };

  let busyTest: { ok: boolean; result?: unknown; error?: string } = { ok: false };
  try {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const busy = await getBusyIntervals(start.toISOString(), end.toISOString());
    busyTest = { ok: true, result: busy };
  } catch (error) {
    // Googleのエラーは「API未有効」「Not Found(カレンダーID誤り)」「forbidden(共有ミス)」等を含む
    busyTest = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const capacityCheck = await checkCapacityConsistency();

  return NextResponse.json({
    env,
    capacityCheck,
    busyTest,
    // 書き込み権限は実際に予定を作って確かめる必要があるため、
    // 副作用のないGETでは行わない。POSTで実行すること。
    writeTest: 'このエンドポイントにPOSTすると、書き込み権限を確認できます',
  });
}

/**
 * カレンダーへの書き込み権限を確認する。
 *
 * 空き枠の取得は読み取り権限だけでも成功するため、「予定の閲覧権限」だけで
 * 共有されていると、空き表示は正常なのに予約が入ってもカレンダーに
 * 書き込まれない状態になる。それを事前に検知する。
 *
 * 10年先の日時に1分間の予定を作り、すぐ削除する。GETと分けているのは、
 * 画面を開いたりリロードしたりするだけで予定が作られるのを避けるため。
 */
export async function POST(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const result = await probeCalendarWriteAccess();

  return NextResponse.json({
    writeTest: {
      ...result,
      hint: result.canWrite
        ? result.leftoverEventId
          ? `書き込みはできましたが、確認用イベントの削除に失敗しました。カレンダーから「[書き込み確認]」の予定を手動で削除してください。`
          : '書き込み権限があります。予約時にカレンダーへ登録されます。'
        : 'カレンダーに書き込めません。Googleカレンダーの共有設定で、サービスアカウントに「予定の変更権限」を付与してください（「予定の閲覧権限」では不足です）。',
    },
  });
}
