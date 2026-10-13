import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = (path) => pathToFileURL(resolve(path)).href;

test('同じ操作の予約番号・GoogleイベントID・Square冪等キーは毎回同じになる', async () => {
  const {
    buildGoogleBookingEventId,
    buildSquareIdempotencyKey,
    buildWorkshopBookingNumber,
  } = await import(moduleUrl('src/lib/workshopBookingSafety.ts'));
  const key = '8b4adf34-c2b8-4dce-b526-81795a6cf754';

  assert.equal(buildWorkshopBookingNumber(key), buildWorkshopBookingNumber(key));
  assert.equal(buildGoogleBookingEventId(key), buildGoogleBookingEventId(key));
  assert.equal(buildSquareIdempotencyKey(key), buildSquareIdempotencyKey(key));
  assert.match(buildGoogleBookingEventId(key), /^[0-9a-v]{5,1024}$/);
  assert.ok(buildSquareIdempotencyKey(key).length <= 45);
});

test('予約の冪等キーはUUIDだけを受け付ける', async () => {
  const { isValidWorkshopIdempotencyKey } = await import(
    moduleUrl('src/lib/workshopBookingSafety.ts')
  );

  assert.equal(isValidWorkshopIdempotencyKey('8b4adf34-c2b8-4dce-b526-81795a6cf754'), true);
  assert.equal(isValidWorkshopIdempotencyKey('not-a-uuid'), false);
  assert.equal(isValidWorkshopIdempotencyKey(''), false);
});

test('顧客情報の異常に長い入力と不正なメールを拒否する', async () => {
  const { validateWorkshopCustomerInput } = await import(
    moduleUrl('src/lib/workshopBookingSafety.ts')
  );

  assert.equal(
    validateWorkshopCustomerInput({
      name: '苔太郎',
      email: 'moss@example.com',
      phone: '011-123-4567',
      notes: '初心者です',
    }),
    null,
  );
  assert.match(
    validateWorkshopCustomerInput({
      name: 'a'.repeat(101),
      email: 'invalid',
      phone: '1',
      notes: '',
    }),
    /氏名/,
  );
  assert.match(
    validateWorkshopCustomerInput({
      name: '苔太郎',
      email: 'invalid',
      phone: '011-123-4567',
      notes: '',
    }),
    /メール/,
  );
  assert.match(
    validateWorkshopCustomerInput({
      name: '苔太郎',
      email: 'moss@example.com',
      phone: '011-123-4567',
      notes: 'a'.repeat(1001),
    }),
    /備考/,
  );
});

test('Googleに作る予約イベントは残席判定をブロックしない', async () => {
  const { buildBookingEventRequest } = await import(moduleUrl('src/lib/googleCalendar.ts'));
  const event = buildBookingEventRequest({
    eventId: 'moss0123456789abcdef',
    idempotencyKey: '8b4adf34-c2b8-4dce-b526-81795a6cf754',
    summary: 'テスト予約',
    startISO: '2026-08-01T11:30:00+09:00',
    endISO: '2026-08-01T13:30:00+09:00',
  });

  assert.equal(event.id, 'moss0123456789abcdef');
  assert.equal(event.transparency, 'transparent');
  assert.equal(event.extendedProperties.private.mossCountryType, 'workshopBooking');
});

test('非404のGoogleイベント削除失敗を握りつぶさない', async () => {
  const source = await readFile(resolve('src/lib/googleCalendar.ts'), 'utf8');
  const catchBlock = source.slice(source.indexOf('export async function deleteBookingEvent'));

  assert.match(catchBlock, /if \(status === 404 \|\| status === 410\)/);
  assert.match(catchBlock, /throw error/);
});

test('予約処理はDBで枠を確保してからGoogleイベントを作成する', async () => {
  const source = await readFile(resolve('src/app/api/workshop/book/route.ts'), 'utf8');
  const reserveAt = source.indexOf('reserveBookingSlot(');
  const calendarAt = source.indexOf('createBookingEvent(');

  assert.ok(reserveAt >= 0, 'reserveBookingSlot を呼ぶ必要がある');
  assert.ok(calendarAt > reserveAt, 'DB予約枠の確保をGoogle登録より先に行う');
  assert.doesNotMatch(source, /idempotency_key:\s*uuidv4\(\)/);
  assert.match(source, /cancelSquarePaymentByIdempotencyKey/);
  assert.match(source, /PAYMENT_STATUS_UNKNOWN/);
});

test('通常キャンセルのメールは予約情報を含み、未完了の返金を完了扱いにしない', async () => {
  const { buildWorkshopCancellationEmail } = await import(
    moduleUrl('src/lib/workshopCancellationEmail.ts')
  );
  const email = buildWorkshopCancellationEmail({
    bookingNumber: 'WS-20261013-001',
    workshopPlanName: '海のテラリウム',
    date: '2026-10-20',
    startTime: '11:30',
    endTime: '13:30',
    partySize: 2,
    customerName: '苔 太郎',
    paymentMethod: 'credit_card',
    total: 9000,
  }, { kind: 'cancelled', needsRefund: true });

  assert.match(email.subject, /予約キャンセルのお知らせ/);
  assert.match(email.text, /予約番号: WS-20261013-001/);
  assert.match(email.text, /プラン: 海のテラリウム/);
  assert.match(email.text, /人数: 2名/);
  assert.match(email.text, /返金手続きはまだ完了していません/);
  assert.doesNotMatch(email.text, /返金いたしました/);
});

test('返金を伴うキャンセルメールは返金額と支払い方法を案内する', async () => {
  const { buildWorkshopCancellationEmail } = await import(
    moduleUrl('src/lib/workshopCancellationEmail.ts')
  );
  const email = buildWorkshopCancellationEmail({
    bookingNumber: 'WS-20261013-002',
    workshopPlanName: '初心者自由制作',
    date: '2026-10-21',
    startTime: '15:00',
    endTime: '17:00',
    partySize: 1,
    customerName: null,
    paymentMethod: 'paypay',
    total: 5500,
  }, { kind: 'refunded', refundAmount: 4000, isFullRefund: false });

  assert.match(email.subject, /キャンセルと返金のお知らせ/);
  assert.match(email.text, /返金金額: ¥4,000/);
  assert.match(email.text, /お支払い金額: ¥5,500/);
  assert.match(email.text, /返金方法: PayPay/);
});

test('管理画面の通常キャンセルはDBのキャンセル成功後に完了メールを送る', async () => {
  const source = await readFile(
    resolve('src/app/api/admin/workshop-bookings/[id]/route.ts'),
    'utf8',
  );
  const cancelAt = source.indexOf('await cancelBooking(');
  const mailAt = source.indexOf('await sendMail(');

  assert.ok(cancelAt >= 0, '予約のキャンセル処理が必要');
  assert.ok(mailAt > cancelAt, 'キャンセル成功後にだけ完了メールを送る');
  assert.match(source, /cancellationEmailStatus/);
});

test('SQLが同時予約・冪等性・分散レート制限をDB側で保証する', async () => {
  const sql = await readFile(
    resolve('docs/sql/migrate-workshop-booking-safety.sql'),
    'utf8',
  );

  assert.match(sql, /idempotency_key/i);
  assert.match(sql, /UNIQUE/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /WORKSHOP_SLOT_CAPACITY_EXCEEDED/);
  assert.match(sql, /consume_api_rate_limit/i);
});

test('GoogleイベントIDはbase32hex（0-9とa-v）の5文字以上に収まる', async () => {
  const { buildGoogleBookingEventId } = await import(
    moduleUrl('src/lib/workshopBookingSafety.ts')
  );

  // Google Calendar のイベントIDは base32hex しか受け付けず、
  // w-z のような範囲外の文字が混ざると「Invalid resource id value.」で
  // 登録に失敗する。予約がカレンダーに入らなくなるため、文字種を固定する。
  for (const key of [
    'a1b2c3d4-0000-0000-0000-000000000000',
    'zzzz-wwww-yyyy-xxxx',
    '予約-2026-08-31-1130',
    '',
  ]) {
    const id = buildGoogleBookingEventId(key);
    assert.match(id, /^[a-v0-9]{5,1024}$/, `使用できない文字が含まれている: ${id}`);
  }
});
