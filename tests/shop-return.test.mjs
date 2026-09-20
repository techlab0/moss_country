import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const projectRoot = process.cwd();
const stateModuleUrl = pathToFileURL(resolve(projectRoot, 'src/lib/shopReturnState.ts')).href;
const { parseShopReturnState } = await import(stateModuleUrl);

test('有効な商品一覧の状態だけを復元する', () => {
  const valid = {
    scrollY: 2400,
    searchQuery: '苔',
    inStockOnly: true,
    selectedCategory: 'テラリウム',
    sortBy: 'priceAsc',
    savedAt: Date.now(),
  };

  assert.deepEqual(parseShopReturnState(JSON.stringify(valid)), valid);
  assert.equal(parseShopReturnState('{broken'), null);
  assert.equal(parseShopReturnState(JSON.stringify({ ...valid, scrollY: '2400' })), null);
});

test('商品詳細から一覧へ戻ると直前の表示位置と絞り込みを復元する', async () => {
  const listPage = await readFile(resolve(projectRoot, 'src/app/shop/page.tsx'), 'utf8');
  const detailPage = await readFile(resolve(projectRoot, 'src/app/shop/[slug]/page.tsx'), 'utf8');
  const productCard = await readFile(resolve(projectRoot, 'src/components/ui/ProductCard.tsx'), 'utf8');
  const backLink = await readFile(resolve(projectRoot, 'src/components/ui/ShopBackLink.tsx'), 'utf8');

  assert.ok(productCard.includes('onClick={onViewDetails}'), '商品詳細を開く直前の処理を呼び出せる');
  assert.ok(listPage.includes('scrollY: window.scrollY'), '商品一覧のスクロール位置を保存する');
  assert.ok(listPage.includes('searchQuery,'), '検索条件を保存する');
  assert.ok(listPage.includes('selectedCategory,'), 'カテゴリ条件を保存する');
  assert.ok(listPage.includes('sortBy,'), '並び順を保存する');
  assert.ok(listPage.includes("window.scrollTo({ top: restoreScrollY, behavior: 'auto' })"), '商品読込後に位置を復元する');
  assert.ok(detailPage.includes('<ShopBackLink'), '商品詳細に復元対応の戻るリンクを表示する');
  assert.ok(backLink.includes('SHOP_RETURN_REQUEST_KEY'), '戻るリンクを押した場合だけ復元を要求する');
});
