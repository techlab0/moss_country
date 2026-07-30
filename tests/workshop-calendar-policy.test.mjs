import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const moduleUrl = (path) => pathToFileURL(resolve(projectRoot, path)).href;

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
