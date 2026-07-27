import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const shippingModuleUrl = pathToFileURL(resolve('src/lib/shipping.ts')).href;
const {
  DEFAULT_SHIPPING_SETTINGS,
  formatShippingDiscountNote,
  resolveShippingFee,
} = await import(shippingModuleUrl);

test('10,000円以上は送料無料ではなく500円引きと案内する', () => {
  const note = formatShippingDiscountNote({
    freeShippingMode: false,
    freeShippingThreshold: 10_000,
    shippingDiscount: 500,
  });

  assert.equal(note, '10,000円以上のご購入で送料500円引き');
});

test('送料無料モードのときだけ全国送料無料と案内する', () => {
  const note = formatShippingDiscountNote({
    freeShippingMode: true,
    freeShippingThreshold: 10_000,
    shippingDiscount: 500,
  });

  assert.equal(note, '全国送料無料');
});

test('送料割引が無効なら案内文を表示しない', () => {
  const note = formatShippingDiscountNote({
    freeShippingMode: false,
    freeShippingThreshold: 10_000,
    shippingDiscount: 0,
  });

  assert.equal(note, '');
});

test('10,000円以上でも実際の送料計算は500円引きにとどまる', () => {
  const result = resolveShippingFee(
    [{ quantity: 1 }],
    '北海道',
    10_000,
    {},
    DEFAULT_SHIPPING_SETTINGS,
  );

  assert.equal(result.ok, true);
  assert.equal(result.baseFee, 810);
  assert.equal(result.discount, 500);
  assert.equal(result.fee, 310);
});

test('顧客向け画面に誤った固定文言を再導入しない', async () => {
  const customerFacingFiles = [
    'src/app/cart/page.tsx',
    'src/app/checkout/page.tsx',
    'src/components/ui/ProductActions.tsx',
    'src/contexts/CartContext.tsx',
  ];
  const contents = await Promise.all(
    customerFacingFiles.map((file) => readFile(resolve(file), 'utf8')),
  );

  for (const content of contents) {
    assert.doesNotMatch(content, /(?:10,000円|1万円)以上で送料無料/);
  }
});
