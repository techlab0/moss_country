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
