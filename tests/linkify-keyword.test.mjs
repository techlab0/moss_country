// フッターの営業日表記は管理画面から編集できるため、決め打ちで切れない。
// 「カレンダー」という語だけをリンクにし、語が無ければ元の文をそのまま出す。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/linkifyKeyword.ts')).href;
const { linkifyKeyword } = await import(moduleUrl);

test('文中の「カレンダー」だけを切り出す', () => {
  const parts = linkifyKeyword('不定休（カレンダーをご確認ください）', 'カレンダー');
  assert.deepEqual(parts, [
    { text: '不定休（', isKeyword: false },
    { text: 'カレンダー', isKeyword: true },
    { text: 'をご確認ください）', isKeyword: false },
  ]);
});

test('語が含まれなければ元の文をそのまま返す（リンクを作らない）', () => {
  const parts = linkifyKeyword('毎週水曜定休', 'カレンダー');
  assert.deepEqual(parts, [{ text: '毎週水曜定休', isKeyword: false }]);
});

test('先頭・末尾にある場合も欠けない', () => {
  assert.deepEqual(linkifyKeyword('カレンダーを見る', 'カレンダー'), [
    { text: 'カレンダー', isKeyword: true },
    { text: 'を見る', isKeyword: false },
  ]);
  assert.deepEqual(linkifyKeyword('詳しくはカレンダー', 'カレンダー'), [
    { text: '詳しくは', isKeyword: false },
    { text: 'カレンダー', isKeyword: true },
  ]);
});

test('複数回出てきてもすべてリンクにする', () => {
  const parts = linkifyKeyword('カレンダーとカレンダー', 'カレンダー');
  assert.equal(parts.filter((p) => p.isKeyword).length, 2);
});

test('未設定でも落ちない', () => {
  assert.deepEqual(linkifyKeyword(null, 'カレンダー'), []);
  assert.deepEqual(linkifyKeyword('', 'カレンダー'), []);
});

test('分割しても元の文字列に戻る（文字が欠けない）', () => {
  const text = '不定休（カレンダーをご確認ください）';
  const joined = linkifyKeyword(text, 'カレンダー')
    .map((p) => p.text)
    .join('');
  assert.equal(joined, text);
});
