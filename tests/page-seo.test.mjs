// ページ別 meta description の上書きと、詳細ページの説明文組み立て。
//
// 管理画面で空欄にしたときに既定値へ戻ること、既定値と同じ文言を保存しないこと、
// CMSの説明文が使い回されていても商品ごとに description が変わることを固定する。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const pageSeoUrl = pathToFileURL(resolve('src/lib/pageSeo.ts')).href;
const { editablePages, autoDescriptionFor, sanitizePageSeo, resolvePageDescription } = await import(pageSeoUrl);

const metaUrl = pathToFileURL(resolve('src/lib/metaDescription.ts')).href;
const { buildMetaDescription, normalizeDescription, truncateDescription } = await import(metaUrl);

test('保存値が無いページは既定値を返す', () => {
  assert.equal(resolvePageDescription('/shop', null), autoDescriptionFor('/shop'));
  assert.equal(resolvePageDescription('/shop', []), autoDescriptionFor('/shop'));
});

test('保存値があればそちらを優先する', () => {
  const overrides = [{ path: '/shop', description: '手動で書いた説明文' }];
  assert.equal(resolvePageDescription('/shop', overrides), '手動で書いた説明文');
  // 他のページは巻き込まれない
  assert.equal(resolvePageDescription('/blog', overrides), autoDescriptionFor('/blog'));
});

test('空欄の保存値は未入力とみなして既定値へ戻す', () => {
  const overrides = [{ path: '/shop', description: '   ' }];
  assert.equal(resolvePageDescription('/shop', overrides), autoDescriptionFor('/shop'));
});

test('編集画面に無いパスは保存しない', () => {
  // 任意のパスを保存できると、どのページに効いているのか追えなくなる
  const saved = sanitizePageSeo([
    { path: '/shop', description: 'ショップの説明' },
    { path: '/admin/secret', description: '対象外' },
    { path: '/blog', description: '   ' },
  ]);
  assert.deepEqual(saved, [{ path: '/shop', description: 'ショップの説明' }]);
});

test('同じパスが重複しても1件に絞る', () => {
  const saved = sanitizePageSeo([
    { path: '/shop', description: '先勝ち' },
    { path: '/shop', description: '後勝ちにはしない' },
  ]);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].description, '先勝ち');
});

test('編集対象のページはすべて既定値を持つ', () => {
  for (const page of editablePages) {
    assert.ok(page.autoDescription.trim() !== '', `${page.path} の既定値が空`);
    assert.ok(page.path.startsWith('/'), `${page.path} は先頭スラッシュが必要`);
  }
});

test('装飾記号と改行を落として1行にする', () => {
  assert.equal(normalizeDescription('**強調**した文\n次の行'), '強調した文 次の行');
  // 中黒は語の一部なので残す
  assert.equal(normalizeDescription('水分・光の条件'), '水分・光の条件');
  // 記号だけを外し、語を区切っていた空白は残す
  assert.equal(normalizeDescription('サイズ ▪️幅 / 約4㎝'), 'サイズ 幅 / 約4㎝');
});

test('Portable Text からも平文を取り出す', () => {
  const blocks = [{ _type: 'block', children: [{ text: '本文の' }, { text: '冒頭' }] }];
  assert.equal(normalizeDescription(blocks), '本文の冒頭');
});

test('上限を超えたら句点で切る', () => {
  const text = `${'あ'.repeat(80)}。${'い'.repeat(80)}`;
  const out = truncateDescription(text, 120);
  assert.ok(out.endsWith('。'));
  assert.ok([...out].length <= 120);
});

test('句点が無ければ三点リーダで切る', () => {
  const out = truncateDescription('あ'.repeat(200), 120);
  assert.equal([...out].length, 121); // 120文字 + …
  assert.ok(out.endsWith('…'));
});

test('説明文が使い回されていても商品ごとに変わる', () => {
  const shared = '表面を飾る砂です。';
  const tail = '北海道・札幌の苔テラリウム専門店です。';
  const a = buildMetaDescription(['富士砂 飾り砂｜¥200', shared, tail]);
  const b = buildMetaDescription(['南国砂 飾り砂｜¥200', shared, tail]);
  assert.notEqual(a, b);
  assert.ok(a.startsWith('富士砂'));
});

test('空の要素は連結時に落とす', () => {
  assert.equal(buildMetaDescription([null, '', undefined, '本文']), '本文');
});
