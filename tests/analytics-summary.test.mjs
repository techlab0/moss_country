// GA4 / Search Console のサマリー整形。
//
// 管理画面のダッシュボードに出す数値なので、0除算や欠損データで
// 「Infinity%」「NaN」といった表示が出ないことを重点的に確認する。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/analyticsSummary.ts')).href;
const { toMetricChange, toRankedRows, buildDateRanges, pickSearchConsoleSite } = await import(moduleUrl);

test('前期間比の変化率を求める', () => {
  assert.equal(toMetricChange(150, 100).changePercent, 50);
  assert.equal(toMetricChange(50, 100).changePercent, -50);
  assert.equal(toMetricChange(100, 100).changePercent, 0);
});

test('前期間が0なら変化率は算出せずnullにする', () => {
  // 0からの増加を「+Infinity%」と表示しないための分岐
  const change = toMetricChange(30, 0);
  assert.equal(change.changePercent, null);
  assert.equal(change.current, 30);
  assert.equal(change.previous, 0);
});

test('数値でない値が来ても0として扱う', () => {
  const change = toMetricChange(Number.NaN, Number.POSITIVE_INFINITY);
  assert.equal(change.current, 0);
  assert.equal(change.previous, 0);
  assert.equal(change.changePercent, null);
});

test('GA4の行を上位順に並べて指定件数まで返す', () => {
  const rows = [
    { dimensionValues: [{ value: '/shop' }], metricValues: [{ value: '120' }] },
    { dimensionValues: [{ value: '/' }], metricValues: [{ value: '300' }] },
    { dimensionValues: [{ value: '/blog' }], metricValues: [{ value: '80' }] },
  ];
  assert.deepEqual(toRankedRows(rows, 2), [
    { label: '/', value: 300 },
    { label: '/shop', value: 120 },
  ]);
});

test('ラベルや数値が欠けた行は順位表に混ぜない', () => {
  const rows = [
    { dimensionValues: [{ value: '' }], metricValues: [{ value: '10' }] },
    { dimensionValues: [{ value: '/shop' }], metricValues: [{ value: 'abc' }] },
    { metricValues: [{ value: '5' }] },
    { dimensionValues: [{ value: '/ok' }], metricValues: [{ value: '5' }] },
  ];
  assert.deepEqual(toRankedRows(rows, 5), [{ label: '/ok', value: 5 }]);
});

test('行が無くても空配列を返す', () => {
  assert.deepEqual(toRankedRows(null, 5), []);
  assert.deepEqual(toRankedRows(undefined, 5), []);
});

test('集計期間は昨日までで、前期間は同じ長さで隣接する', () => {
  // 当日はデータが確定しないため終端を昨日にする
  const ranges = buildDateRanges(28, new Date('2026-09-08T00:00:00Z'));
  // 9/7を含む28日間は 8/11〜9/7、その直前の28日間は 7/14〜8/10
  assert.deepEqual(ranges.current, { startDate: '2026-08-11', endDate: '2026-09-07' });
  assert.deepEqual(ranges.previous, { startDate: '2026-07-14', endDate: '2026-08-10' });
});

test('Search Consoleはドメインプロパティを優先して選ぶ', () => {
  const sites = [
    { siteUrl: 'https://example.com/' },
    { siteUrl: 'sc-domain:mosscountry.com' },
    { siteUrl: 'https://mosscountry.com/' },
  ];
  assert.equal(pickSearchConsoleSite(sites, 'mosscountry.com'), 'sc-domain:mosscountry.com');
});

test('ドメインプロパティが無ければURLプレフィックスを使う', () => {
  const sites = [{ siteUrl: 'https://example.com/' }, { siteUrl: 'https://mosscountry.com/' }];
  assert.equal(pickSearchConsoleSite(sites, 'mosscountry.com'), 'https://mosscountry.com/');
});

test('権限のあるサイトが無ければnullを返す', () => {
  assert.equal(pickSearchConsoleSite([{ siteUrl: 'https://example.com/' }], 'mosscountry.com'), null);
  assert.equal(pickSearchConsoleSite([], 'mosscountry.com'), null);
  assert.equal(pickSearchConsoleSite(null, 'mosscountry.com'), null);
});

test('環境変数で明示されたサイトURLを最優先する', () => {
  const sites = [{ siteUrl: 'sc-domain:mosscountry.com' }];
  assert.equal(
    pickSearchConsoleSite(sites, 'mosscountry.com', 'https://mosscountry.com/'),
    'https://mosscountry.com/'
  );
  // 空文字は「未設定」として扱い、自動解決に任せる
  assert.equal(pickSearchConsoleSite(sites, 'mosscountry.com', '  '), 'sc-domain:mosscountry.com');
});
