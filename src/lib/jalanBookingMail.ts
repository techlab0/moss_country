// じゃらんnet（ACTIVITY BOARD）からの予約通知メールを解析する。
//
// 対象は3種類だけで、いずれも本文の「▲ 予約内容」ブロックは同一フォーマット。
// 種別は送信元アドレスで判定する（件名・本文の文言に依存しない。実データで送信元が
// 種別ごとに完全に分かれていることを確認済み）。
//
//   reservation_request@activityboard.jp → 仮予約（まだ確定していない）
//   reservation@activityboard.jp         → 予約確定
//   reservation_cancel@activityboard.jp  → キャンセル
//
// 上記以外（info@ = メッセージ受信、autoextension_* = プラン自動延長、reminder@ = 督促）は
// 予約台帳と無関係なので対象外とする。
//
// 仮予約と確定で予約番号は同一（実データで確認）。このため予約番号をキーにすれば
// 同じメールを何度読み込んでも二重登録にならず、確定メールは既存行の更新になる。

/** このモジュールが扱う通知の種別 */
export type JalanMailKind = 'tentative' | 'confirmed' | 'cancelled';

const SENDER_KINDS: Record<string, JalanMailKind> = {
  'reservation_request@activityboard.jp': 'tentative',
  'reservation@activityboard.jp': 'confirmed',
  'reservation_cancel@activityboard.jp': 'cancelled',
};

export interface JalanBooking {
  kind: JalanMailKind;
  /** じゃらんの予約番号（例: 31E1TTKAQ）。仮予約と確定で同一 */
  bookingNumber: string;
  /** 利用日（YYYY-MM-DD, JST） */
  date: string;
  /** 開始時刻（HH:MM, JST） */
  startTime: string;
  /** 終了時刻（HH:MM, JST） */
  endTime: string;
  planName: string;
  /** 合計人数。内訳（器のサイズ別）は取らない */
  partySize: number;
  /** じゃらん上の支払方法の文字列（例: 現地払い） */
  paymentMethodLabel: string;
  /** 合計料金(税込)。円 */
  totalYen: number;
  /** ポイント利用額。円相当（1ポイント=1円） */
  pointYen: number;
  /** クーポン利用額。円 */
  couponYen: number;
  /** ■カスタマへの請求額■。当日その場で受け取る金額。円 */
  chargeAtVenueYen: number;
  /** 体験者氏名（末尾の「様」は除去する） */
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  emergencyPhone: string;
}

/** From ヘッダー（"表示名 <addr>" 形式もありうる）からメールアドレスだけを取り出す */
export function extractEmailAddress(fromHeader: string): string {
  const angled = fromHeader.match(/<([^>]+)>/);
  return (angled ? angled[1] : fromHeader).trim().toLowerCase();
}

/**
 * 送信元から通知の種別を判定する。対象外の送信元なら null。
 * 呼び出し側は null を「取り込まないメール」として静かに読み飛ばすこと。
 */
export function resolveJalanMailKind(fromHeader: string): JalanMailKind | null {
  return SENDER_KINDS[extractEmailAddress(fromHeader)] ?? null;
}

function matchOne(body: string, pattern: RegExp): string | null {
  return body.match(pattern)?.[1]?.trim() ?? null;
}

/** "7,000" のような桁区切り付きの金額文字列を数値にする */
function parseYen(raw: string | null): number {
  if (raw === null) return 0;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export class JalanMailParseError extends Error {}

/**
 * 予約通知メールの本文を解析する。
 *
 * 解析できない場合は例外を投げる（黙って一部欠けたまま予約を作ると、日付や人数が
 * 不正な予約が台帳に入り、枠の空き計算まで狂うため）。呼び出し側は失敗を記録して
 * そのメールだけ取り込まない、という扱いにすること。
 */
export function parseJalanBookingMail(fromHeader: string, rawBody: string): JalanBooking {
  const kind = resolveJalanMailKind(fromHeader);
  if (!kind) {
    throw new JalanMailParseError(`取込み対象外の送信元です: ${fromHeader}`);
  }

  // 改行コードの違い（CRLF）で行頭アンカーが効かなくなるのを避ける
  const body = rawBody.replace(/\r\n/g, '\n');

  const bookingNumber = matchOne(body, /^予約番号[：:]\s*([A-Za-z0-9]+)/m);
  if (!bookingNumber) {
    throw new JalanMailParseError('予約番号を読み取れませんでした');
  }

  // 例: 利用日時：2026/08/22(土) 11:30～13:30
  const dateTime = body.match(
    /^利用日時[：:]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})\([^)]*\)\s*(\d{1,2}:\d{2})\s*[～~〜-]\s*(\d{1,2}:\d{2})/m
  );
  if (!dateTime) {
    throw new JalanMailParseError('利用日時を読み取れませんでした');
  }
  const [, year, month, day, startTime, endTime] = dateTime;
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // 例: 人数：2名  (おひとり様（約横6cmx縦11cm）:1名、...)
  const partySizeRaw = matchOne(body, /^人数[：:]\s*(\d+)\s*名/m);
  const partySize = partySizeRaw ? Number(partySizeRaw) : 0;
  if (!partySize || partySize < 1) {
    throw new JalanMailParseError('人数を読み取れませんでした');
  }

  const planName = matchOne(body, /^プラン名[：:]\s*(.+)$/m);
  if (!planName) {
    throw new JalanMailParseError('プラン名を読み取れませんでした');
  }

  // 「※クーポン利用最低金額：0円」と混同しないよう、いずれも行頭アンカーで拾う
  return {
    kind,
    bookingNumber,
    date,
    startTime: startTime.padStart(5, '0'),
    endTime: endTime.padStart(5, '0'),
    planName,
    partySize,
    paymentMethodLabel: matchOne(body, /^支払方法[：:]\s*(.+)$/m) ?? '',
    totalYen: parseYen(matchOne(body, /^合計料金\(税込\)[：:]\s*([\d,]+)\s*円/m)),
    pointYen: parseYen(matchOne(body, /^ポイント利用額[：:]\s*([\d,]+)\s*ポイント/m)),
    couponYen: parseYen(matchOne(body, /^クーポン利用額[：:]\s*([\d,]+)\s*円/m)),
    chargeAtVenueYen: parseYen(matchOne(body, /■カスタマへの請求額■\s*([\d,]+)\s*円/)),
    // 「○○様」の末尾の敬称は落とす（台帳の表示側で付けるため）
    customerName: (matchOne(body, /^体験者氏名[：:]\s*(.+)$/m) ?? '').replace(/様$/, '').trim(),
    customerEmail: matchOne(body, /^メールアドレス[：:]\s*(\S+)/m) ?? '',
    customerPhone: matchOne(body, /^電話番号[：:]\s*(\S+)/m) ?? '',
    emergencyPhone: matchOne(body, /^当日緊急連絡先[：:]\s*(\S+)/m) ?? '',
  };
}
