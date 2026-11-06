import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('お問い合わせページでワークショップの予約期限と当日参加条件を案内する', async () => {
  const [registry, contactPage] = await Promise.all([
    readFile(new URL('../src/lib/pageContentRegistry.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/contact/page.tsx', import.meta.url), 'utf8'),
  ]);

  for (const text of [
    '前日までにお申し込みいただければご参加いただけます',
    '予約枠と材料に空きがある場合は可能です',
    '当日のお申し込みをお断りする場合がございます',
  ]) {
    assert.ok(registry.includes(text));
    assert.ok(contactPage.includes(text));
  }

  assert.ok(contactPage.includes('LEGACY_WORKSHOP_BOOKING_ANSWER'));
  assert.ok(!registry.includes('開催日の3日前までにご予約をお願いいたします'));
});
