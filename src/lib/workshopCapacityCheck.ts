// 受付枠の定員が、コードとDBトリガーで一致しているかを確認する。
//
// 定員は2か所にある:
//   コード側 CAPACITY_PER_SLOT … 画面表示と予約時の事前チェック
//   DBトリガー enforce_workshop_slot_capacity … 最終保証（同時予約に対する定員の担保）
//
// 実際に片方だけ変更された事故が起きている（2026-08-05にコードだけ4→6へ変更され、
// トリガーは4のまま残っていた）。食い違うと、画面上は「空きあり」なのに予約確定の
// 瞬間だけ失敗し、お客様からは「空いているのに予約できない」ように見える。
// 症状から原因にたどり着くのが難しいので、機械的に検知できるようにしている。
//
// DB側の値は get_workshop_slot_capacity 関数で読む
// （docs/sql/fix-workshop-slot-capacity.sql で作成）。

import { createClient } from '@supabase/supabase-js';
import { CAPACITY_PER_SLOT } from '@/lib/workshopBookingConfig';

export interface CapacityCheckResult {
  ok: boolean;
  /** コード側の定員 */
  code: number;
  /** DBトリガーが強制している定員。読み取れなければ null */
  database: number | null;
  message: string;
}

export async function checkCapacityConsistency(): Promise<CapacityCheckResult> {
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
        message: `DB側の定員を確認できませんでした（${error.message}）。docs/sql/fix-workshop-slot-capacity.sql を実行してください`,
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
        message: `定員が食い違っています（画面の設定 ${CAPACITY_PER_SLOT}名 / データベース ${database}名）。${Math.min(database, CAPACITY_PER_SLOT) + 1}名以上の予約が、空きがあるように見えても確定時に失敗します`,
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
