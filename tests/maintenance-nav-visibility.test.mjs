// 準備中（ページ別メンテナンス）とヘッダー・フッターのリンク表示の連携。
//
// 準備中にしたページは配下も含めて止め、そのページへのリンクも自動で隠す。
// 一方で「/shopping」のような名前が似ているだけの別ページを巻き込んではいけない。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/siteSettingsDefaults.ts')).href;
const { isMaintenancePath, isNavLinkVisible } = await import(moduleUrl);

test('準備中ページ本体とその配下をまとめて対象にする', () => {
  const pages = ['/shop'];
  assert.equal(isMaintenancePath('/shop', pages), true);
  assert.equal(isMaintenancePath('/shop/moss-terrarium-01', pages), true);
  assert.equal(isMaintenancePath('/shop/category/moss', pages), true);
});

test('名前が前方一致するだけの別ページは巻き込まない', () => {
  const pages = ['/shop'];
  assert.equal(isMaintenancePath('/shopping', pages), false);
  assert.equal(isMaintenancePath('/shop-guide', pages), false);
  assert.equal(isMaintenancePath('/', pages), false);
});

test('準備中が空なら何も止めない', () => {
  assert.equal(isMaintenancePath('/shop', []), false);
});

test('準備中ページへのリンクは表示設定がオンでも隠す', () => {
  const link = { label: '商品', href: '/shop', isVisible: true };
  assert.equal(isNavLinkVisible(link, []), true);
  assert.equal(isNavLinkVisible(link, ['/shop']), false);
});

test('準備中を解除すれば元の表示設定に戻る', () => {
  const shown = { label: '商品', href: '/shop', isVisible: true };
  const hidden = { label: 'FAQ', href: '/faq', isVisible: false };
  // 保存値を書き換えていないので、準備中リストから外すだけで元通りになる
  assert.equal(isNavLinkVisible(shown, []), true);
  // 手動で非表示にしたリンクは、準備中と無関係に隠れたまま
  assert.equal(isNavLinkVisible(hidden, []), false);
});

test('外部リンクは準備中の影響を受けない', () => {
  const link = { label: 'Instagram', href: 'https://www.instagram.com/moss.country/', isVisible: true };
  assert.equal(isNavLinkVisible(link, ['/shop']), true);
});
