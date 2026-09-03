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
    thresholdFreeShippingEnabled: false,
    freeShippingThreshold: 10_000,
    shippingDiscount: 500,
  });

  assert.equal(note, '10,000円以上のご購入で送料500円引き');
});

test('送料無料モードのときだけ全国送料無料と案内する', () => {
  const note = formatShippingDiscountNote({
    freeShippingMode: true,
    thresholdFreeShippingEnabled: false,
    freeShippingThreshold: 10_000,
    shippingDiscount: 500,
  });

  assert.equal(note, '全国送料無料');
});

test('送料割引が無効なら案内文を表示しない', () => {
  const note = formatShippingDiscountNote({
    freeShippingMode: false,
    thresholdFreeShippingEnabled: false,
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
    {
      ...DEFAULT_SHIPPING_SETTINGS,
      thresholdFreeShippingEnabled: false,
      freeShippingThreshold: 10_000,
      shippingDiscount: 500,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.baseFee, 810);
  assert.equal(result.discount, 500);
  assert.equal(result.fee, 310);
});

test('8,000円以上送料無料の案内に重量物の注意書きを表示する', () => {
  const note = formatShippingDiscountNote({
    freeShippingMode: false,
    thresholdFreeShippingEnabled: true,
    freeShippingThreshold: 8_000,
    shippingDiscount: 0,
  });

  assert.equal(
    note,
    '8,000円以上のご購入で送料無料\n※重量物は別途送料をいただく可能性がございます。\n※重量物により別途送料をいただく場合は、メールまたはお電話にてご連絡し、ご承諾後に配送いたします。',
  );
});

test('対象小計が8,000円以上なら計算結果の送料も0円になる', () => {
  const result = resolveShippingFee(
    [{ quantity: 1 }],
    '北海道',
    8_000,
    {},
    DEFAULT_SHIPPING_SETTINGS,
  );

  assert.equal(result.ok, true);
  assert.equal(result.baseFee, 810);
  assert.equal(result.discount, 810);
  assert.equal(result.fee, 0);
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
