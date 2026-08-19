// 一覧表示用のプラン名短縮。
// じゃらんのプラン名は販促文込みで100文字を超えることがあり、スマホの一覧では
// 1件で画面が埋まる。経路（じゃらん）と（仮）は判断に使うので必ず残す必要がある。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/workshopPlanDisplay.ts')).href;
const { shortenPlanName, DEFAULT_PLAN_NAME_MAX } = await import(moduleUrl);

const LONG = 'じゃらん / ＼実店舗オープン／【北海道/札幌】癒しの苔テラリウム作り体験 〜自然を手のひらに〜当日持ち帰りOK♪♪＜女性・カップル・ファミリー・お友達同士おすすめ♪＞';

test('じゃらんの長いプラン名を短くする', () => {
  const short = shortenPlanName(LONG);
  assert.ok(short.length < LONG.length);
  assert.ok(short.endsWith('…'));
});

test('経路が分かる接頭辞は必ず残す', () => {
  // ここを削ると、一覧でじゃらん経由かどうか判別できなくなる
  assert.ok(shortenPlanName(LONG).startsWith('じゃらん / '));
});

test('仮予約の印も残す', () => {
  const short = shortenPlanName(`（仮）${LONG}`);
  assert.ok(short.startsWith('（仮）じゃらん / '));
});

test('短いプラン名はそのまま返す', () => {
  assert.equal(shortenPlanName('テストプラン'), 'テストプラン');
  assert.equal(shortenPlanName('じゃらん / 苔テラリウム'), 'じゃらん / 苔テラリウム');
});

test('未設定でも落ちない', () => {
  assert.equal(shortenPlanName(null), '');
  assert.equal(shortenPlanName(undefined), '');
  assert.equal(shortenPlanName(''), '');
});

test('上限は呼び出し側で変えられる', () => {
  const short = shortenPlanName(LONG, 5);
  assert.ok(short.length < shortenPlanName(LONG, DEFAULT_PLAN_NAME_MAX).length);
});
