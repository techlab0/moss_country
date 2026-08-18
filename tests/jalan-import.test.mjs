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
  applyActionToView,
  buildJalanBookingNumber,
  buildJalanIdempotencyKey,
  buildPlanName,
  isTentativeBooking,
  TENTATIVE_PREFIX,
} = await import(moduleUrl);

/**
 * 試し実行と同じ流れ（DBに書かず、直前までの操作を覚えながら順に処理する）を再現して、
 * メール列に対する操作の並びを返す。
 */
function planSequence(mails, initialView = null) {
  let view = initialView;
  return mails.map((m) => {
    const action = planImportAction(m, view, TODAY, SLOT_CONFIG);
    view = applyActionToView(view, m, action);
    return action;
  });
}

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

// ここから下は「1件の予約につき2〜3通のメールが届く」ことに起因する連続処理の検証。
// 試し実行はDBに書かないため、直前までの操作を覚えていないと同じ予約を
// 「新規登録」2件として表示してしまい、実際の反映結果と食い違う。

test('仮予約→確定の2通で、新規登録は1件だけになる', () => {
  const actions = planSequence([mail(), mail({ kind: 'confirmed' })]);
  assert.deepEqual(actions[0], { type: 'create', tentative: true });
  assert.deepEqual(actions[1], { type: 'confirm' });
});

test('仮予約→確定→キャンセルの3通が順に反映される', () => {
  const actions = planSequence([
    mail(),
    mail({ kind: 'confirmed' }),
    mail({ kind: 'cancelled' }),
  ]);
  assert.deepEqual(actions.map((a) => a.type), ['create', 'confirm', 'cancel']);
});

test('同じ仮予約メールが2通届いても新規登録は1件だけ', () => {
  const actions = planSequence([mail(), mail()]);
  assert.equal(actions[0].type, 'create');
  assert.equal(actions[1].type, 'skip');
});

test('確定のみ→キャンセルでも正しく消える（仮予約を取りこぼした場合）', () => {
  const actions = planSequence([mail({ kind: 'confirmed' }), mail({ kind: 'cancelled' })]);
  assert.deepEqual(actions.map((a) => a.type), ['create', 'cancel']);
});

test('キャンセル後に同じ予約番号の通知が来ても復活させない', () => {
  const actions = planSequence([
    mail(),
    mail({ kind: 'cancelled' }),
    mail({ kind: 'confirmed' }),
  ]);
  assert.deepEqual(actions.map((a) => a.type), ['create', 'cancel', 'skip']);
});

test('applyActionToViewは確定で「（仮）」を外す', () => {
  const created = applyActionToView(null, mail(), { type: 'create', tentative: true });
  assert.ok(created.workshopPlanName.startsWith(TENTATIVE_PREFIX));

  const confirmed = applyActionToView(created, mail({ kind: 'confirmed' }), { type: 'confirm' });
  assert.ok(!confirmed.workshopPlanName.startsWith(TENTATIVE_PREFIX));

  const cancelled = applyActionToView(confirmed, mail({ kind: 'cancelled' }), { type: 'cancel' });
  assert.equal(cancelled.status, 'cancelled');
});

test('キャンセル済みの予約に仮予約・確定が届いたら自動で復活させない', () => {
  const cancelled = booking({ status: 'cancelled' });
  assert.equal(planImportAction(mail(), cancelled, TODAY, SLOT_CONFIG).type, 'skip');
  assert.equal(planImportAction(mail({ kind: 'confirmed' }), cancelled, TODAY, SLOT_CONFIG).type, 'skip');
});
