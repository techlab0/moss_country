import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const moduleUrl = (path) => pathToFileURL(resolve(projectRoot, path)).href;
const source = (path) => readFile(resolve(projectRoot, path), 'utf8');

test('在庫調整は商品ID・整数の在庫数・変更理由を検証する', async () => {
  const { parseInventoryAdjustment } = await import(
    moduleUrl('src/lib/inventoryAdjustment.ts')
  );

  assert.deepEqual(
    parseInventoryAdjustment({ productId: 'product-123', stockQuantity: 12, note: '棚卸し結果' }),
    {
      ok: true,
      value: { productId: 'product-123', stockQuantity: 12, note: '棚卸し結果' },
    },
  );
  assert.equal(parseInventoryAdjustment({ productId: '', stockQuantity: 12, note: '棚卸し' }).ok, false);
  assert.equal(parseInventoryAdjustment({ productId: 'p1', stockQuantity: -1, note: '棚卸し' }).ok, false);
  assert.equal(parseInventoryAdjustment({ productId: 'p1', stockQuantity: 1.5, note: '棚卸し' }).ok, false);
  assert.equal(parseInventoryAdjustment({ productId: 'p1', stockQuantity: 1_000_001, note: '棚卸し' }).ok, false);
  assert.equal(parseInventoryAdjustment({ productId: 'p1', stockQuantity: 1, note: '  ' }).ok, false);
  assert.equal(parseInventoryAdjustment({ productId: 'p1', stockQuantity: 1, note: 'a'.repeat(201) }).ok, false);
});

test('商品管理は在庫を変更せず在庫管理への導線を表示する', async () => {
  const [listPage, newPage, editPage, productsApi, sanityLib] = await Promise.all([
    source('src/app/admin/products/page.tsx'),
    source('src/app/admin/products/new/page.tsx'),
    source('src/app/admin/products/[id]/edit/page.tsx'),
    source('src/app/api/admin/products/route.ts'),
    source('src/lib/sanity.ts'),
  ]);

  assert.doesNotMatch(listPage, /handleStockUpdate/);
  assert.match(listPage, /href="\/admin\/inventory"/);
  assert.doesNotMatch(newPage, /初期在庫数量/);
  assert.doesNotMatch(editPage.slice(editPage.indexOf('const payload'), editPage.indexOf('const response')), /stockQuantity/);
  assert.match(productsApi, /stockQuantity:\s*0/);
  assert.doesNotMatch(sanityLib, /export async function updateProductInventory/);
});

test('在庫調整APIは管理者を検証し、商品更新と実履歴を同じトランザクションで保存する', async () => {
  const updateRoute = await source('src/app/api/admin/inventory/update/route.ts');

  assert.match(updateRoute, /verifyAdminSession/);
  assert.match(updateRoute, /parseInventoryAdjustment/);
  assert.match(updateRoute, /\.transaction\(\)/);
  assert.match(updateRoute, /_type:\s*'inventoryLog'/);
  assert.match(updateRoute, /operation:\s*'adjustment'/);
  assert.match(updateRoute, /revalidateTag\('products'\)/);
});

test('在庫管理画面は管理APIの実データと変更理由を使い、モック履歴を表示しない', async () => {
  const inventoryPage = await source('src/app/admin/inventory/page.tsx');

  assert.match(inventoryPage, /fetch\('\/api\/admin\/inventory'/);
  assert.match(inventoryPage, /在庫変更理由/);
  assert.doesNotMatch(inventoryPage, /mock-1|モックログデータ|prompt\(/);
});

test('店頭売上で在庫連動できない商品を管理画面へ警告する', async () => {
  const [inventoryLink, transactionRoute, transactionEditRoute, salesPage] = await Promise.all([
    source('src/lib/storeInventory.ts'),
    source('src/app/api/admin/transactions/route.ts'),
    source('src/app/api/admin/transactions/[id]/route.ts'),
    source('src/app/admin/sales/page.tsx'),
  ]);

  assert.match(inventoryLink, /StoreInventoryResult/);
  assert.match(inventoryLink, /売上項目に紐づく商品が設定されていません/);
  assert.match(inventoryLink, /同じ売上項目に商品が.*紐づいているため/);
  assert.match(inventoryLink, /if \(applied\)/);
  assert.match(transactionRoute, /inventoryWarnings/);
  assert.match(transactionEditRoute, /inventoryWarnings/);
  assert.match(salesPage, /在庫に反映されませんでした/);
  assert.match(salesPage, /商品管理の「売上明細の項目」を確認してください/);
});
