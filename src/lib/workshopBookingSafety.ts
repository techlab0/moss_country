import { createHash } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WORKSHOP_INPUT_LIMITS = {
  name: 100,
  email: 254,
  phone: 30,
  notes: 1000,
} as const;

export function isValidWorkshopIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** 同じ予約操作から常に同じ、顧客向けの予約番号を生成する。 */
export function buildWorkshopBookingNumber(idempotencyKey: string): string {
  return `WS-${idempotencyKey.replace(/-/g, '').toUpperCase()}`;
}

/**
 * Google Calendarのevent.idに使えるbase32hex互換文字だけで決定的なIDを生成する。
 * 16進文字はGoogleが許可する0-9/a-vの部分集合なので、そのまま利用できる。
 */
export function buildGoogleBookingEventId(idempotencyKey: string): string {
  return `moss${digest(idempotencyKey).slice(0, 48)}`;
}

/** Squareの45文字制限内に収まる、再送時も変わらない冪等キー。 */
export function buildSquareIdempotencyKey(idempotencyKey: string): string {
  return `ws-${idempotencyKey}`;
}

export function validateWorkshopCustomerInput(input: {
  name: string | undefined;
  email: string | undefined;
  phone: string | undefined;
  notes: string | undefined;
}): string | null {
  if (!input.name || input.name.length > WORKSHOP_INPUT_LIMITS.name) {
    return `氏名は1〜${WORKSHOP_INPUT_LIMITS.name}文字で入力してください`;
  }
  if (
    !input.email ||
    input.email.length > WORKSHOP_INPUT_LIMITS.email ||
    !EMAIL_RE.test(input.email)
  ) {
    return 'メールアドレスの形式が正しくありません';
  }
  if (!input.phone || input.phone.length > WORKSHOP_INPUT_LIMITS.phone) {
    return `電話番号は1〜${WORKSHOP_INPUT_LIMITS.phone}文字で入力してください`;
  }
  if (input.notes && input.notes.length > WORKSHOP_INPUT_LIMITS.notes) {
    return `備考は${WORKSHOP_INPUT_LIMITS.notes}文字以内で入力してください`;
  }
  return null;
}
