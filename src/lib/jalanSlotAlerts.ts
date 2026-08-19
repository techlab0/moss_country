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
//
// 入力に computeSlotStatuses（全枠を状態付きで返す）を使うこと。computeAvailableSlots は
// 予約可能な枠しか返さないため、満席・休業日という最も重要な枠が入力に含まれない。

import type { SlotStatus } from '@/lib/workshopAvailability';

/** 残りこの人数以下になったら、じゃらん側の在庫を絞る検討対象として知らせる */
export const LOW_REMAINING_THRESHOLD = 2;

export interface SlotAlert {
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
  /**
   * full: 満席なので必ず閉じる
   * closed: 休業日・受付停止なので必ず閉じる
   * low: 残りわずかなので在庫を絞る検討が必要
   */
  level: 'full' | 'closed' | 'low';
  /** closed の理由（営業日ではありません、など） */
  reason?: string;
}

/**
 * じゃらん側で対応が必要な枠を、日付・開始時刻の昇順で返す。
 *
 * 受付締切を過ぎた枠（past）は対象にしない。今から知らせても間に合わず、
 * 件数だけ増えて本当に対応が必要な枠が埋もれるため。
 */
export function findSlotsToCloseOnJalan(
  statuses: readonly SlotStatus[],
  threshold: number = LOW_REMAINING_THRESHOLD
): SlotAlert[] {
  const alerts: SlotAlert[] = [];

  for (const slot of statuses) {
    const base = {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      remaining: slot.remaining,
    };

    if (slot.state === 'full') {
      alerts.push({ ...base, level: 'full' });
    } else if (slot.state === 'closed') {
      alerts.push({ ...base, level: 'closed', reason: slot.reason });
    } else if (slot.state === 'open' && slot.remaining <= threshold) {
      alerts.push({ ...base, level: 'low' });
    }
  }

  return alerts.sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );
}

/** 1日の全枠が閉じている日付の一覧。日単位でまとめて表示するために使う */
export function findFullyClosedDates(alerts: readonly SlotAlert[], slotsPerDay: number): string[] {
  const closedByDate = new Map<string, number>();
  for (const alert of alerts) {
    if (alert.level !== 'closed') continue;
    closedByDate.set(alert.date, (closedByDate.get(alert.date) ?? 0) + 1);
  }
  return [...closedByDate.entries()]
    .filter(([, count]) => count >= slotsPerDay)
    .map(([date]) => date)
    .sort();
}

/**
 * 予約完了時に店舗宛メールへ添える一文。
 * 満枠になった瞬間に気付けないと、じゃらん側から追加で売れてしまうため。
 * 対応が不要な場合は null を返す。
 */
export function buildJalanCloseWarning(alert: SlotAlert | null): string | null {
  if (!alert) return null;

  const board = 'https://acb.jalan.net/gw/kanri/slogin.html';

  if (alert.level === 'full') {
    return [
      '━━━━━━━━━━━━━━━━━━━━',
      '【要対応】この枠は満席になりました。',
      `じゃらん（ACTIVITY BOARD）で ${alert.date} ${alert.startTime} の在庫を閉じてください。`,
      '閉じないとじゃらん経由で追加の予約が入り、定員を超えます。',
      board,
      '━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
  }

  if (alert.level === 'closed') {
    return [
      '━━━━━━━━━━━━━━━━━━━━',
      `【要対応】この枠は受け付けていません（${alert.reason ?? '受付停止中'}）。`,
      `じゃらん（ACTIVITY BOARD）で ${alert.date} ${alert.startTime} の在庫を閉じてください。`,
      board,
      '━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `【確認】この枠の残りは ${alert.remaining} 名です（${alert.date} ${alert.startTime}）。`,
    'じゃらん（ACTIVITY BOARD）側の在庫が残り人数を超えていないか確認してください。',
    board,
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
