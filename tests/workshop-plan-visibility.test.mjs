import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const moduleUrl = (path) => pathToFileURL(resolve(projectRoot, path)).href;

test('非表示カードに紐づく予約プランだけを予約対象外にする', async () => {
  const { hiddenWorkshopPlanIdsFromOverrides } = await import(
    moduleUrl('src/lib/workshopPlanVisibility.ts')
  );

  assert.deepEqual(hiddenWorkshopPlanIdsFromOverrides([
    { key: 'plan1BookingPlanId', value: 'booking-a' },
    { key: 'plan1Visible', value: 'false' },
    { key: 'plan2BookingPlanId', value: 'booking-b' },
    { key: 'plan2Visible', value: 'true' },
  ]), ['booking-a']);
});

test('同じ予約プランに表示中カードがあれば予約を停止しない', async () => {
  const { hiddenWorkshopPlanIdsFromOverrides } = await import(
    moduleUrl('src/lib/workshopPlanVisibility.ts')
  );

  assert.deepEqual(hiddenWorkshopPlanIdsFromOverrides([
    { key: 'plan1BookingPlanId', value: 'booking-a' },
    { key: 'plan1Visible', value: 'false' },
    { key: 'plan2BookingPlanId', value: 'booking-a' },
    { key: 'plan2Visible', value: 'true' },
  ]), []);
});

test('予約プラン未選択のカードは紹介ページだけの表示設定として扱う', async () => {
  const { hiddenWorkshopPlanIdsFromOverrides } = await import(
    moduleUrl('src/lib/workshopPlanVisibility.ts')
  );

  assert.deepEqual(hiddenWorkshopPlanIdsFromOverrides([
    { key: 'plan1Visible', value: 'false' },
  ]), []);
});
