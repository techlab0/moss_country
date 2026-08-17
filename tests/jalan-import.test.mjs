// じゃらん予約メールを台帳へ反映するときの判断ロジックを固定する。
//
// ここが誤ると次のいずれかが起きる:
// - 仮予約が枠を押さえられず、自社サイトからも同じ枠が売れてダブルブッキングになる
// - 同じメールを読むたびに二重登録され、枠が実際より埋まって予約を取りこぼす
// - キャンセルが反映されず、空いているはずの枠が埋まったままになる

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/jalanImport.ts')).href;
// 受付枠と定員は実際の設定をそのまま渡す（テスト用に別値を書くと本番とズレるため）
const configUrl = pathToFileURL(resolve('src/lib/workshopBookingConfig.ts')).href;
const { WORKSHOP_SLOTS, CAPACITY_PER_SLOT } = await import(configUrl);
const SLOT_CONFIG = { slots: WORKSHOP_SLOTS, capacityPerSlot: CAPACITY_PER_SLOT };
const {
  planImportAction,
  buildJalanBookingNumber,
  buildJalanIdempotencyKey,
  buildPlanName,
  isTentativeBooking,
  TENTATIVE_PREFIX,
} = await import(moduleUrl);

const TODAY = '2026-08-18';

function mail(overrides = {}) {
  return {
    kind: 'tentative',
    bookingNumber: '31E1TTKAQ',
    date: '2026-08-22',
    startTime: '11:30',
    endTime: '13:30',
    planName: '癒しの苔テラリウム作り体験',
    partySize: 2,
    paymentMethodLabel: '現地払い',
    totalYen: 7000,
    pointYen: 5000,
    couponYen: 0,
    chargeAtVenueYen: 2000,
    customerName: 'テスト太郎',
    customerEmail: 'masked@example.com',
    customerPhone: '08000000000',
    emergencyPhone: '08000000001',
    ...overrides,
  };
}

function booking(overrides = {}) {
  return {
    id: 'uuid-1',
    status: 'confirmed',
    workshopPlanName: `${TENTATIVE_PREFIX}じゃらん / 癒しの苔テラリウム作り体験`,
    ...overrides,
  };
}

test('予約番号と冪等キーはじゃらんの番号から決まる', () => {
  assert.equal(buildJalanBookingNumber('31E1TTKAQ'), 'JALAN-31E1TTKAQ');
  assert.equal(buildJalanIdempotencyKey('31E1TTKAQ'), 'jalan-31E1TTKAQ');
});

test('仮予約は「（仮）」付きで登録し、確定後は外す', () => {
  assert.ok(buildPlanName(mail(), true).startsWith(TENTATIVE_PREFIX));
  assert.ok(!buildPlanName(mail(), false).startsWith(TENTATIVE_PREFIX));
  assert.ok(isTentativeBooking(booking()));
  assert.ok(!isTentativeBooking(booking({ workshopPlanName: 'じゃらん / 体験' })));
});

test('新規の仮予約は（仮）付きで登録する', () => {
  const action = planImportAction(mail(), null, TODAY, SLOT_CONFIG);
  assert.deepEqual(action, { type: 'create', tentative: true });
});

test('同じ仮予約を再度読んでも二重登録しない', () => {
  const action = planImportAction(mail(), booking(), TODAY, SLOT_CONFIG);
  assert.equal(action.type, 'skip');
});

test('確定通知は既存の仮予約を確定に切り替える', () => {
  const action = planImportAction(mail({ kind: 'confirmed' }), booking(), TODAY, SLOT_CONFIG);
  assert.deepEqual(action, { type: 'confirm' });
});

test('確定済みの予約に確定通知が再度届いても何もしない', () => {
  const confirmed = booking({ workshopPlanName: 'じゃらん / 体験' });
  const action = planImportAction(mail({ kind: 'confirmed' }), confirmed, TODAY, SLOT_CONFIG);
  assert.equal(action.type, 'skip');
});

test('仮予約を取りこぼしていても確定通知だけで登録できる', () => {
  const action = planImportAction(mail({ kind: 'confirmed' }), null, TODAY, SLOT_CONFIG);
  assert.deepEqual(action, { type: 'create', tentative: false });
});

test('キャンセル通知は既存予約をキャンセルする', () => {
  const action = planImportAction(mail({ kind: 'cancelled' }), booking(), TODAY, SLOT_CONFIG);
  assert.deepEqual(action, { type: 'cancel' });
});

test('キャンセル済みを再度キャンセルしない', () => {
  const cancelled = booking({ status: 'cancelled' });
  const action = planImportAction(mail({ kind: 'cancelled' }), cancelled, TODAY, SLOT_CONFIG);
  assert.equal(action.type, 'skip');
});

test('台帳に無い予約のキャンセル通知は何もしない', () => {
  const action = planImportAction(mail({ kind: 'cancelled' }), null, TODAY, SLOT_CONFIG);
  assert.equal(action.type, 'skip');
});

test('過去の利用日は取り込まない（過去メール200件超を流し込まないため）', () => {
  const past = mail({ date: '2026-08-01' });
  assert.equal(planImportAction(past, null, TODAY, SLOT_CONFIG).type, 'skip');
});

test('当日の予約は取り込む（過去扱いにしない）', () => {
  const today = mail({ date: TODAY });
  assert.deepEqual(planImportAction(today, null, TODAY, SLOT_CONFIG), { type: 'create', tentative: true });
});

test('過去日でもキャンセルは反映する（台帳に残った予約を消せなくなるため）', () => {
  const pastCancel = mail({ kind: 'cancelled', date: '2026-08-01' });
  assert.deepEqual(planImportAction(pastCancel, booking(), TODAY, SLOT_CONFIG), { type: 'cancel' });
});

test('受付枠に無い開始時刻は自動で寄せず人に判断させる', () => {
  const odd = mail({ startTime: '13:00' });
  const action = planImportAction(odd, null, TODAY, SLOT_CONFIG);
  assert.equal(action.type, 'skip');
  assert.match(action.reason, /受付枠/);
});

test('既知の枠（11:30 / 15:00）はどちらも取り込む', () => {
  assert.equal(planImportAction(mail({ startTime: '11:30' }), null, TODAY, SLOT_CONFIG).type, 'create');
  assert.equal(
    planImportAction(mail({ startTime: '15:00', endTime: '17:00' }), null, TODAY, SLOT_CONFIG).type,
    'create'
  );
});

test('定員を超える人数は取り込まない', () => {
  const tooMany = mail({ partySize: 7 });
  const action = planImportAction(tooMany, null, TODAY, SLOT_CONFIG);
  assert.equal(action.type, 'skip');
  assert.match(action.reason, /定員/);
});

test('キャンセル済みの予約に仮予約・確定が届いたら自動で復活させない', () => {
  const cancelled = booking({ status: 'cancelled' });
  assert.equal(planImportAction(mail(), cancelled, TODAY, SLOT_CONFIG).type, 'skip');
  assert.equal(planImportAction(mail({ kind: 'confirmed' }), cancelled, TODAY, SLOT_CONFIG).type, 'skip');
});
