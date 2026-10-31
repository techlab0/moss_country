import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  isSameCalendarItem,
  normalizeBulkCalendarItem,
} from '../src/app/admin/calendar/calendarBulk.ts';

test('一括設定用の入力は前後の空白を除き、種類に不要な欄を保存しない', () => {
  assert.deepEqual(
    normalizeBulkCalendarItem({
      type: 'event',
      title: '  苔イベント  ',
      location: '  札幌駅前  ',
      notes: 'イベントでは使用しない',
    }),
    {
      type: 'event',
      title: '苔イベント',
      location: '札幌駅前',
      notes: undefined,
    },
  );

  assert.deepEqual(
    normalizeBulkCalendarItem({
      type: 'closed',
      title: '  臨時休業  ',
      location: '休業日では使用しない',
      notes: '  店舗整備  ',
    }),
    {
      type: 'closed',
      title: '臨時休業',
      location: undefined,
      notes: '店舗整備',
    },
  );
});

test('同じ種類・タイトル・場所・補足の項目だけを重複と判定する', () => {
  const existing = {
    type: 'event',
    title: '苔イベント',
    location: '札幌駅前',
  };

  assert.equal(isSameCalendarItem(existing, { ...existing }), true);
  assert.equal(isSameCalendarItem(existing, { ...existing, title: '別のイベント' }), false);
  assert.equal(isSameCalendarItem(existing, { ...existing, location: '大通公園' }), false);
  assert.equal(isSameCalendarItem(existing, { type: 'open', title: '苔イベント', location: '札幌駅前' }), false);
});

test('管理画面には複数日選択・一括保存・失敗日の再選択が実装されている', async () => {
  const source = await readFile(new URL('../src/app/admin/calendar/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /複数日を選択/);
  assert.match(source, /月を移動して別の月の日付も一緒に選べます/);
  assert.match(source, /失敗した日だけ選択状態に残しています/);
  assert.match(source, /同じ内容の重複だけを避けます/);
  assert.match(source, /Promise\.all\(datesToSave\.map/);
});
