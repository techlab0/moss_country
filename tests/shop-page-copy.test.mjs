import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
