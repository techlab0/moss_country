// じゃらん側で閉じるべき枠の判定を固定する。
//
// じゃらんは在庫を外部から操作できないため、閉じ忘れるとオーバーブッキングになる。
// 「満席」と「休業日」を取りこぼすのが最も危険なので、そこを重点的に固める。
// （実際に、予約可能な枠だけを入力にしていたため満席を一度も検知できていない不具合があった）

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/jalanSlotAlerts.ts')).href;
const {
  findSlotsToCloseOnJalan,
  findFullyClosedDates,
  filterToRegisteredMonths,
  buildJalanCloseWarning,
  findAlertForSlot,
  LOW_REMAINING_THRESHOLD,
} = await import(moduleUrl);

function slot(date, startTime, state, remaining = 0, reason = undefined) {
  return {
    date,
    startTime,
    endTime: startTime === '11:30' ? '13:30' : '17:00',
    remaining,
    state,
    reason,
  };
}

test('満席の枠を必ず拾う', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-09-21', '15:00', 'full')]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].level, 'full');
});

test('休業日・受付停止の枠も拾う（じゃらんが開いていると予約が入ってしまう）', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-09-21', '15:00', 'closed', 0, '営業日ではありません（定休日・イベント出店など）'),
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].level, 'closed');
  assert.match(alerts[0].reason, /営業日ではありません/);
});

test('残りわずかの枠はlowとして拾う', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-09-21', '15:00', 'open', LOW_REMAINING_THRESHOLD),
  ]);
  assert.equal(alerts[0].level, 'low');
});

test('十分に空いている枠は拾わない（通知が多すぎると見なくなるため）', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-09-21', '15:00', 'open', LOW_REMAINING_THRESHOLD + 1),
  ]);
  assert.deepEqual(alerts, []);
});

test('受付締切を過ぎた枠は知らせない（今から閉じても間に合わない）', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-08-19', '11:30', 'past')]);
  assert.deepEqual(alerts, []);
});

test('日付・開始時刻の昇順に並べる', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-09-22', '11:30', 'full'),
    slot('2026-09-21', '15:00', 'full'),
    slot('2026-09-21', '11:30', 'open', 1),
  ]);
  assert.deepEqual(
    alerts.map((a) => `${a.date} ${a.startTime}`),
    ['2026-09-21 11:30', '2026-09-21 15:00', '2026-09-22 11:30']
  );
});

test('閾値は呼び出し側で変えられる', () => {
  const slots = [slot('2026-09-21', '15:00', 'open', 4)];
  assert.equal(findSlotsToCloseOnJalan(slots).length, 0);
  assert.equal(findSlotsToCloseOnJalan(slots, 4).length, 1);
});

test('全枠が閉じている日は日単位でまとめられる', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-09-21', '11:30', 'closed', 0, '営業日ではありません'),
    slot('2026-09-21', '15:00', 'closed', 0, '営業日ではありません'),
    slot('2026-09-22', '11:30', 'closed', 0, '受付枠を停止中です'),
    slot('2026-09-22', '15:00', 'open', 5),
  ]);
  // 2枠とも閉じている9/21だけが対象。片方だけの9/22は枠単位で見せる
  assert.deepEqual(findFullyClosedDates(alerts, 2), ['2026-09-21']);
});

test('満席の警告文はACTIVITY BOARDでの操作を明示する', () => {
  const [alert] = findSlotsToCloseOnJalan([slot('2026-09-21', '15:00', 'full')]);
  const text = buildJalanCloseWarning(alert);
  assert.match(text, /要対応/);
  assert.match(text, /2026-09-21 15:00/);
  assert.match(text, /acb\.jalan\.net/);
});

test('休業日の警告文には理由を含める', () => {
  const [alert] = findSlotsToCloseOnJalan([
    slot('2026-09-21', '15:00', 'closed', 0, '営業日ではありません（定休日・イベント出店など）'),
  ]);
  const text = buildJalanCloseWarning(alert);
  assert.match(text, /要対応/);
  assert.match(text, /営業日ではありません/);
});

test('残りわずかの警告文は「閉じる」ではなく確認を促す', () => {
  const [alert] = findSlotsToCloseOnJalan([slot('2026-09-21', '15:00', 'open', 1)]);
  const text = buildJalanCloseWarning(alert);
  assert.match(text, /確認/);
  assert.match(text, /残りは 1 名/);
});

test('対応不要なら警告文は付けない', () => {
  assert.equal(buildJalanCloseWarning(null), null);
});

test('予約した枠に対応するアラートだけを取り出す', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-09-21', '11:30', 'full'),
    slot('2026-09-21', '15:00', 'full'),
  ]);
  assert.equal(findAlertForSlot(alerts, '2026-09-21', '15:00').startTime, '15:00');
  assert.equal(findAlertForSlot(alerts, '2026-09-22', '11:30'), null);
});


// 営業日カレンダーを登録していない先の月は「休業」ではなく「予定が未定」。
// 月まるごと警告に並ぶと、本当に対応が必要な日が埋もれてしまう。

test('営業日カレンダー未登録の月は警告しない', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-08-26', '11:30', 'closed', 0, '営業日ではありません'),
    slot('2026-09-05', '11:30', 'closed', 0, '営業日ではありません'),
  ]);
  const filtered = filterToRegisteredMonths(alerts, new Set(['2026-08']));

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].date, '2026-08-26');
});

test('登録済みの月は満席・残りわずかも含めてすべて残る', () => {
  const alerts = findSlotsToCloseOnJalan([
    slot('2026-08-22', '11:30', 'full'),
    slot('2026-08-23', '15:00', 'open', 1),
  ]);
  const filtered = filterToRegisteredMonths(alerts, new Set(['2026-08']));
  assert.equal(filtered.length, 2);
});

test('登録月が空なら何も警告しない', () => {
  const alerts = findSlotsToCloseOnJalan([slot('2026-08-26', '11:30', 'full')]);
  assert.deepEqual(filterToRegisteredMonths(alerts, new Set()), []);
});
