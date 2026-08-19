// クエリパラメータの数値読み取り。
//
// Number(null) が 0 になることに起因して、「今後30日分」を見るはずの一覧が
// 「1日分」しか見ない不具合が実際に起きた。未指定時に既定値へ落ちることを固定する。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/requestParams.ts')).href;
const { parsePositiveInt } = await import(moduleUrl);

test('未指定なら既定値を使う（Number(null)が0になる罠）', () => {
  assert.equal(parsePositiveInt(null, 30), 30);
  assert.equal(parsePositiveInt(undefined, 30), 30);
  assert.equal(parsePositiveInt('', 30), 30);
});

test('数値として読める値はそのまま使う', () => {
  assert.equal(parsePositiveInt('7', 30), 7);
  assert.equal(parsePositiveInt(7, 30), 7);
});

test('0・負数・数値でない値は既定値に落とす', () => {
  assert.equal(parsePositiveInt('0', 30), 30);
  assert.equal(parsePositiveInt('-5', 30), 30);
  assert.equal(parsePositiveInt('abc', 30), 30);
});

test('小数は切り捨てる', () => {
  assert.equal(parsePositiveInt('7.9', 30), 7);
});

test('min / max の範囲に収める', () => {
  assert.equal(parsePositiveInt('100', 30, { max: 60 }), 60);
  assert.equal(parsePositiveInt('1', 30, { min: 5 }), 5);
  // 既定値自体も範囲に収める
  assert.equal(parsePositiveInt(null, 100, { max: 60 }), 60);
});
