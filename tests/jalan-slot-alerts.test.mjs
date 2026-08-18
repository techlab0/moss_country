// じゃらん側で閉じるべき枠の判定を固定する。
//
// じゃらんは在庫を外部から操作できないため、閉じ忘れるとオーバーブッキングになる。
// 満枠の枠を「対応不要」と誤判定することが最も危険なので、そこを重点的に固める。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/jalanSlotAlerts.ts')).href;
const { findSlotsToCloseOnJalan, buildJalanCloseWarning, findAlertForSlot, LOW_REMAINING_THRESHOLD } =
  await import(moduleUrl);

function slot(date, startTime, remaining) {
  return { date, startTime, endTime: startTime === '11:30' ? '13:30' : '17:00', remaining };
}

test('満枠の枠はfullとして必ず拾う', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-08-22', '11:30', 0)]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].level, 'full');
});

test('残りわずかの枠はlowとして拾う', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-08-22', '11:30', LOW_REMAINING_THRESHOLD)]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].level, 'low');
});

test('十分に空いている枠は拾わない（通知が多すぎると見なくなるため）', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-08-22', '11:30', LOW_REMAINING_THRESHOLD + 1)]);
  assert.deepEqual(alerts, []);
});

test('残りがマイナスでも満枠側に倒す', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-08-22', '11:30', -1)]);
  assert.equal(alerts[0].level, 'full');
});

test('日付・開始時刻の昇順に並べる', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-08-23', '11:30', 0),
    slot('2026-08-22', '15:00', 0),
    slot('2026-08-22', '11:30', 1),
  ]);
  assert.deepEqual(
    alerts.map((a) => `${a.date} ${a.startTime}`),
    ['2026-08-22 11:30', '2026-08-22 15:00', '2026-08-23 11:30']
  );
});

test('閾値は呼び出し側で変えられる', () => {
  const slots = [slot('2026-08-22', '11:30', 4)];
  assert.equal(findSlotsToCloseOnJalan(slots).length, 0);
  assert.equal(findSlotsToCloseOnJalan(slots, 4).length, 1);
});

test('満枠の警告文にはACTIVITY BOARDでの操作を明示する', () => {
  const [alert] = findSlotsToCloseOnJalan([slot('2026-08-22', '11:30', 0)]);
  const text = buildJalanCloseWarning(alert);
  assert.match(text, /要対応/);
  assert.match(text, /2026-08-22 11:30/);
  assert.match(text, /acb\.jalan\.net/);
});

test('残りわずかの警告文は「閉じる」ではなく確認を促す', () => {
  const [alert] = findSlotsToCloseOnJalan([slot('2026-08-22', '11:30', 1)]);
  const text = buildJalanCloseWarning(alert);
  assert.match(text, /確認/);
  assert.match(text, /残りは 1 名/);
});

test('対応不要なら警告文は付けない', () => {
  assert.equal(buildJalanCloseWarning(null), null);
});

test('予約した枠に対応するアラートだけを取り出す', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-08-22', '11:30', 0),
    slot('2026-08-22', '15:00', 0),
  ]);
  assert.equal(findAlertForSlot(alerts, '2026-08-22', '15:00').startTime, '15:00');
  assert.equal(findAlertForSlot(alerts, '2026-08-23', '11:30'), null);
});
