// じゃらん予約通知メールを予約台帳へ反映する際の判断ロジックと実行。
//
// 運用方針（決定済み）:
// - 仮予約の段階で枠を押さえる。じゃらん側で仮予約が入った時点で自社サイトの空きを減らさないと
//   ダブルブッキングになるため。プラン名の先頭に「（仮）」を付けて、確定前だと分かるようにする
// - 確定通知が届いたら「（仮）」を外す。予約番号は仮予約と確定で同一なので同じ行を更新できる
// - キャンセル通知が届いたら、その予約をキャンセルにして枠を解放する
// - 売上は予約側で計上しない（payment_method: 'on_site' / payment_status: 'pending'）。
//   当日レジで受け取った分だけが売上になる。ポイント充当分はじゃらんからの入金時に
//   手入力取引として計上する運用。予約側で計上するとレジ入力と二重計上になる
//
// 判断ロジック（planImportAction）はDBに触らない純粋関数にしてある。ここを誤ると
// 枠の空き計算が狂って予約の取りこぼしやダブルブッキングに直結するため、単体テストで固定する。

// 受付枠の定義と定員は引数で受け取る。判断ロジックを node --test から直接読み込んで
// テストしており、'@/' エイリアスはNext.jsのビルド外では解決できないため、
// このモジュールからは他のモジュールを実行時importしない作りにしてある。
// 呼び出し側は workshopBookingConfig の WORKSHOP_SLOTS / CAPACITY_PER_SLOT をそのまま渡すこと。
import type { JalanBooking } from '@/lib/jalanBookingMail';
import type { WorkshopBooking } from '@/lib/workshopBookings';

export interface SlotConfig {
  slots: ReadonlyArray<{ start: string; end: string }>;
  capacityPerSlot: number;
}

/** 仮予約であることを示すプラン名の接頭辞 */
export const TENTATIVE_PREFIX = '（仮）';

/** 台帳上の予約番号。じゃらんの番号と1対1で対応させ、ACTIVITY BOARD側と突き合わせられるようにする */
export function buildJalanBookingNumber(jalanNumber: string): string {
  return `JALAN-${jalanNumber}`;
}

/** 同じ予約に対して常に同じキー。仮予約→確定→キャンセルが同じ行を指すようにする */
export function buildJalanIdempotencyKey(jalanNumber: string): string {
  return `jalan-${jalanNumber}`;
}

export function isTentativeBooking(booking: Pick<WorkshopBooking, 'workshopPlanName'>): boolean {
  return (booking.workshopPlanName ?? '').startsWith(TENTATIVE_PREFIX);
}

export type ImportAction =
  /** 新規に台帳へ登録する */
  | { type: 'create'; tentative: boolean }
  /** 既存の仮予約から「（仮）」を外して確定にする */
  | { type: 'confirm' }
  /** 既存の予約をキャンセルして枠を解放する */
  | { type: 'cancel' }
  /** 何もしない。reasonは管理画面にそのまま表示する */
  | { type: 'skip'; reason: string };

/**
 * 1通のメールに対して台帳へ何をするかを決める。DBには触らない。
 *
 * @param existing 同じ予約番号で既に台帳にある予約（無ければ null）
 * @param todayJst JSTの今日（YYYY-MM-DD）。過去の利用日を取り込まないための基準
 * @param config 受付枠と定員（workshopBookingConfig の値を渡す）
 */
export function planImportAction(
  mail: JalanBooking,
  existing: WorkshopBooking | null,
  todayJst: string,
  config: SlotConfig
): ImportAction {
  // 過去メールが200件以上あるため、済んだ予約まで台帳へ流し込まないようにする。
  // キャンセル通知だけは、既に台帳にある予約を消す必要があるので日付で弾かない。
  if (mail.date < todayJst && mail.kind !== 'cancelled') {
    return { type: 'skip', reason: `利用日が過去です（${mail.date}）` };
  }

  // じゃらん側で枠の時間が変更された場合など。自動で当てずっぽうに寄せず人に判断させる
  if (!config.slots.some((slot) => slot.start === mail.startTime)) {
    return { type: 'skip', reason: `受付枠にない開始時刻です（${mail.startTime}）` };
  }

  if (mail.partySize > config.capacityPerSlot) {
    return { type: 'skip', reason: `人数が定員を超えています（${mail.partySize}名）` };
  }

  if (mail.kind === 'cancelled') {
    if (!existing) {
      return { type: 'skip', reason: '台帳に該当の予約がありません' };
    }
    if (existing.status === 'cancelled') {
      return { type: 'skip', reason: 'すでにキャンセル済みです' };
    }
    return { type: 'cancel' };
  }

  if (mail.kind === 'tentative') {
    if (!existing) {
      return { type: 'create', tentative: true };
    }
    if (existing.status === 'cancelled') {
      // キャンセル済みの予約番号に仮予約通知が来るのは想定外。自動で復活させない
      return { type: 'skip', reason: 'キャンセル済みの予約に仮予約通知が届きました。手動で確認してください' };
    }
    return { type: 'skip', reason: '登録済みです' };
  }

  // mail.kind === 'confirmed'
  if (!existing) {
    // 仮予約メールを取りこぼしていても、確定だけで登録できるようにする
    return { type: 'create', tentative: false };
  }
  if (existing.status === 'cancelled') {
    return { type: 'skip', reason: 'キャンセル済みの予約に確定通知が届きました。手動で確認してください' };
  }
  if (isTentativeBooking(existing)) {
    return { type: 'confirm' };
  }
  return { type: 'skip', reason: '確定済みです' };
}

/** 台帳に入れるプラン名。仮予約のあいだだけ「（仮）」を付ける */
export function buildPlanName(mail: JalanBooking, tentative: boolean): string {
  return `${tentative ? TENTATIVE_PREFIX : ''}じゃらん / ${mail.planName}`;
}

/**
 * 備考欄。金額の内訳をここに残す。
 * 売上には計上しない方針のため、いくら受け取るはずかを人が読める形で残しておく必要がある。
 */
export function buildNotes(mail: JalanBooking): string {
  return [
    `じゃらん予約番号: ${mail.bookingNumber}`,
    `支払方法: ${mail.paymentMethodLabel}`,
    `合計料金(税込): ${mail.totalYen.toLocaleString()}円`,
    `ポイント利用: ${mail.pointYen.toLocaleString()}円`,
    `クーポン利用: ${mail.couponYen.toLocaleString()}円`,
    `当日現地でお預かりする額: ${mail.chargeAtVenueYen.toLocaleString()}円`,
    mail.emergencyPhone ? `当日緊急連絡先: ${mail.emergencyPhone}` : '',
    'このメールから自動取込みされた予約です。',
  ]
    .filter(Boolean)
    .join('\n');
}
