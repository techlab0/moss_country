import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/salesAggregation.ts')).href;
const {
  calculateSalesGrandTotal,
  distributeJalanPointAmount,
  resolveJalanPointPayment,
} = await import(moduleUrl);

test('じゃらんポイントを1ポイント1円として総売上に加算する', () => {
  assert.equal(
    calculateSalesGrandTotal({
      storeTotal: 10_000,
      adjustment: 500,
      wordOfMouthDiscount: 300,
      ecTotal: 2_000,
      workshopTotal: 4_000,
      jalanPointAmount: 800,
    }),
    17_000
  );
});

test('既存データのようにじゃらんポイントが未設定でも従来どおり計算する', () => {
  assert.equal(
    calculateSalesGrandTotal({
      storeTotal: 10_000,
      adjustment: -500,
      wordOfMouthDiscount: 300,
      ecTotal: 2_000,
    }),
    11_200
  );
});

test('1件の売上をじゃらんポイントと実受取額に分ける', () => {
  assert.deepEqual(resolveJalanPointPayment(5_000, 1_000), {
    jalanPointAmount: 1_000,
    receivedAmount: 4_000,
  });
  assert.deepEqual(resolveJalanPointPayment(5_000, undefined), {
    jalanPointAmount: 0,
    receivedAmount: 5_000,
  });
  assert.throws(() => resolveJalanPointPayment(5_000, 5_001), /売上合計以下/);
});

test('一括入力のじゃらんポイントは各売上へ按分し、合計を保つ', () => {
  const distributed = distributeJalanPointAmount([3_000, 2_000], 1_000);
  assert.deepEqual(distributed, [600, 400]);
  assert.equal(distributed.reduce((sum, value) => sum + value, 0), 1_000);
});

test('じゃらんポイントは入力・保存・日別・月次・バックアップの各経路で同じ項目名を使う', async () => {
  const files = await Promise.all([
    'sanity/schemas/dailySales.ts',
    'sanity/schemas/storeTransaction.ts',
    'src/app/admin/sales/page.tsx',
    'src/app/api/admin/transactions/route.ts',
    'src/app/api/admin/transactions/[id]/route.ts',
    'src/app/api/admin/transactions/historical-bulk/route.ts',
    'src/app/api/admin/sales/[date]/route.ts',
    'src/app/api/admin/sales/monthly/route.ts',
    'src/lib/salesBackup.ts',
  ].map(path => readFile(path, 'utf8')));

  for (const source of files) {
    assert.match(source, /jalanPointAmount/);
  }
  assert.match(files[1], /うち、じゃらんポイント（円）/);
  assert.match(files[2], /うち、じゃらんポイント/);
  assert.match(files[3], /resolveJalanPointPayment/);
  assert.match(files[4], /resolveJalanPointPayment/);
  assert.match(files[5], /distributeJalanPointAmount/);
  assert.match(files[6], /transactionJalanPointTotal/);
  assert.match(files[7], /jalanPointTotal/);
  assert.match(files[8], /transactionJalanPointTotal/);
});
