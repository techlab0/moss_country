import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/salesAggregation.ts')).href;
const { calculateSalesGrandTotal } = await import(moduleUrl);

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

test('じゃらんポイントは入力・保存・日別・月次・バックアップの各経路で同じ項目名を使う', async () => {
  const files = await Promise.all([
    'sanity/schemas/dailySales.ts',
    'src/app/admin/sales/page.tsx',
    'src/app/api/admin/sales/[date]/route.ts',
    'src/app/api/admin/sales/monthly/route.ts',
    'src/lib/salesBackup.ts',
  ].map(path => readFile(path, 'utf8')));

  for (const source of files) {
    assert.match(source, /jalanPointAmount/);
  }
  assert.match(files[1], /じゃらんポイント（円）/);
  assert.match(files[2], /Math\.max\(0, Number\(body\.jalanPointAmount\)/);
  assert.match(files[3], /jalanPointTotal/);
  assert.match(files[4], /calculateSalesGrandTotal/);
});
