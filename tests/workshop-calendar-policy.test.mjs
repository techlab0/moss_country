import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const moduleUrl = (path) => pathToFileURL(resolve(projectRoot, path)).href;

test('公開予約は暦月で3か月後まで受け付ける', async () => {
  const { ADVANCE_MONTHS, addCalendarMonthsToDateStr } = await import(
    moduleUrl('src/lib/workshopBookingConfig.ts')
  );

  assert.equal(ADVANCE_MONTHS, 3);
  assert.equal(addCalendarMonthsToDateStr('2026-10-01', ADVANCE_MONTHS), '2027-01-01');
  assert.equal(addCalendarMonthsToDateStr('2026-01-31', ADVANCE_MONTHS), '2026-04-30');
});

test('予約画面はサーバーの受付期間を使い、3か月より先を問い合わせへ案内する', async () => {
  const bookingPage = await readFile(resolve(projectRoot, 'src/app/workshop/booking/page.tsx'), 'utf8');

  assert.ok(bookingPage.includes('/api/workshop/availability?planId='));
  assert.ok(!bookingPage.includes('getDate() + 60'));
  assert.ok(bookingPage.includes('3か月より先の日程は'));
  assert.ok(bookingPage.includes('href="/contact"'));
});

test('営業日登録がある日だけワークショップを受け付ける', async () => {
  const { buildWorkshopCalendarPolicy, isWorkshopBusinessDate } = await import(
    moduleUrl('src/lib/workshopCalendarPolicy.ts')
  );
  const policy = buildWorkshopCalendarPolicy([
    { date: '2026-10-01', type: 'open' },
    { date: '2026-10-02', type: 'event' },
  ]);

  assert.equal(isWorkshopBusinessDate(policy, '2026-10-01'), true);
  assert.equal(isWorkshopBusinessDate(policy, '2026-10-02'), false);
  assert.equal(isWorkshopBusinessDate(policy, '2026-10-03'), false);
});

test('同じ日に営業日と休業日がある場合は休業日を優先する', async () => {
  const { buildWorkshopCalendarPolicy, isWorkshopBusinessDate } = await import(
    moduleUrl('src/lib/workshopCalendarPolicy.ts')
  );
  const policy = buildWorkshopCalendarPolicy([
    { date: '2026-10-04', type: 'open' },
    { date: '2026-10-04', type: 'closed' },
  ]);

  assert.equal(isWorkshopBusinessDate(policy, '2026-10-04'), false);
  assert.equal(policy.closedDates.has('2026-10-04'), true);
});

test('明示した受付枠のON/OFFを営業日表示より優先する', async () => {
  const { buildWorkshopCalendarPolicy, isWorkshopSlotEnabled } = await import(
    moduleUrl('src/lib/workshopCalendarPolicy.ts')
  );
  const policy = buildWorkshopCalendarPolicy([
    { date: '2026-10-01', type: 'open' },
    { date: '2026-10-02', type: 'closed' },
  ]);

  assert.equal(isWorkshopSlotEnabled(policy, '2026-10-01', undefined), true);
  assert.equal(isWorkshopSlotEnabled(policy, '2026-10-01', false), false);
  assert.equal(isWorkshopSlotEnabled(policy, '2026-10-02', true), true);
  assert.equal(isWorkshopSlotEnabled(policy, '2026-10-03', true), true);
  assert.equal(isWorkshopSlotEnabled(policy, '2026-10-03', undefined), false);
});

test('管理画面と公開予約が同じ受付枠優先ルールを使用する', async () => {
  const adminApi = await readFile(resolve(projectRoot, 'src/app/api/admin/workshop-slots/route.ts'), 'utf8');
  const availability = await readFile(resolve(projectRoot, 'src/lib/workshopAvailability.ts'), 'utf8');
  const adminPage = await readFile(resolve(projectRoot, 'src/app/admin/workshop-bookings/page.tsx'), 'utf8');

  assert.ok(adminApi.includes('isWorkshopSlotEnabled('), '管理画面APIで共通判定を使う');
  assert.ok(availability.includes('isWorkshopSlotEnabled('), '公開予約の空き枠判定で共通判定を使う');
  assert.ok(!adminPage.includes('disabled={!businessDay}'), '営業日未登録でも受付枠を操作できる');
  assert.ok(!adminPage.includes('if (!day?.businessDay || day.closed) return'), '休業表示でも受付枠を操作できる');
});
