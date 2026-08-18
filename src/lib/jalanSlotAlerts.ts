// じゃらん側で在庫を閉じるべき受付枠を洗い出す。
//
// じゃらんの遊び・体験予約は在庫を外部から操作する手段が提供されておらず
// （サイトコントローラー非対応・事業者向けAPIなし）、ACTIVITY BOARDの管理画面で
// 手動で閉じるしかない。
//
// そのため連携は非対称になっている:
//   じゃらん → 自社サイト … 自動（メール取込みで枠が埋まる）
//   自社サイト → じゃらん … 手動（閉じ忘れるとオーバーブッキングになる）
//
// このモジュールは自動化できない代わりに「どの枠を閉じればよいか」を見逃さないようにする。
// DBやAPIには触らない純粋関数なので、判定条件をテストで固定できる。

import type { AvailableSlot } from '@/lib/workshopAvailability';

/** 残りこの人数以下になったら、じゃらん側の在庫を絞る検討対象として知らせる */
export const LOW_REMAINING_THRESHOLD = 2;

export interface SlotAlert {
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
  /** full: 満枠なので必ず閉じる / low: 残りわずかなので在庫を絞る検討が必要 */
  level: 'full' | 'low';
}

/**
 * じゃらん側で対応が必要な枠を、日付・開始時刻の昇順で返す。
 *
 * @param slots computeAvailableSlots の結果
 * @param threshold 「残りわずか」とみなす人数（既定 LOW_REMAINING_THRESHOLD）
 */
export function findSlotsToCloseOnJalan(
  slots: readonly AvailableSlot[],
  threshold: number = LOW_REMAINING_THRESHOLD
): SlotAlert[] {
  return slots
    .filter((slot) => slot.remaining <= threshold)
    .map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      remaining: slot.remaining,
      // 残0以下は「必ず閉じる」。マイナスは想定しないが、満枠側に倒して扱う
      level: slot.remaining <= 0 ? ('full' as const) : ('low' as const),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

/**
 * 予約完了時に店舗宛メールへ添える一文。
 * 満枠になった瞬間に気付けないと、じゃらん側から追加で売れてしまうため。
 * 対応が不要な場合は null を返す。
 */
export function buildJalanCloseWarning(alert: SlotAlert | null): string | null {
  if (!alert) return null;

  if (alert.level === 'full') {
    return [
      '━━━━━━━━━━━━━━━━━━━━',
      '【要対応】この枠は満席になりました。',
      `じゃらん（ACTIVITY BOARD）で ${alert.date} ${alert.startTime} の在庫を閉じてください。`,
      '閉じないとじゃらん経由で追加の予約が入り、定員を超えます。',
      'https://acb.jalan.net/gw/kanri/slogin.html',
      '━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `【確認】この枠の残りは ${alert.remaining} 名です（${alert.date} ${alert.startTime}）。`,
    'じゃらん（ACTIVITY BOARD）側の在庫が残り人数を超えていないか確認してください。',
    'https://acb.jalan.net/gw/kanri/slogin.html',
    '━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

/** 指定の枠に対応するアラートを1件だけ取り出す（予約直後の通知用） */
export function findAlertForSlot(
  alerts: readonly SlotAlert[],
  date: string,
  startTime: string
): SlotAlert | null {
  return alerts.find((a) => a.date === date && a.startTime === startTime) ?? null;
}
