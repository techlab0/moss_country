import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('商品ページはテラリウム以外の商品にも合う見出しと説明を表示する', async () => {
  const registry = await readFile('src/lib/pageContentRegistry.ts', 'utf8');
  const shopPage = await readFile('src/app/shop/page.tsx', 'utf8');

  for (const source of [registry, shopPage]) {
    assert.match(source, /MOSS COUNTRYの商品コレクション/);
    assert.match(source, /苔テラリウムをはじめ、制作を楽しむための素材や関連アイテムまで/);
  }
  assert.match(shopPage, /t\('heroTitle'\) === legacyHeroTitle/);
  assert.match(shopPage, /t\('heroLead'\) === legacyHeroLead/);
});

test('商品ページと商品管理のカテゴリ選択に資材を追加する', async () => {
  const moduleUrl = pathToFileURL(resolve('src/lib/productCategories.ts')).href;
  const { PRODUCT_CATEGORIES, resolveCategory } = await import(moduleUrl);
  const shopPage = await readFile('src/app/shop/page.tsx', 'utf8');

  assert.ok(PRODUCT_CATEGORIES.includes('資材'));
  assert.equal(resolveCategory('資材'), '資材');
  assert.match(shopPage, /PRODUCT_CATEGORIES\.map/);
});
