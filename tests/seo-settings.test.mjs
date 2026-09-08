// サイトのメタデータ設定と検索エンジン向けrobots指定の整合。
//
// 管理画面のインデックス許可トグルは robots.txt とHTMLのrobotsメタタグの両方を切り替える必要がある。
// 以前は layout.tsx が index:false を直書きしていたため、許可してもメタタグがnoindexのままだった。

import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/seoSettings.ts')).href;
const { defaultSeoSettings, mergeSeoSettings, normalizeGtmContainerId, buildRobotsDirectives } =
  await import(moduleUrl);

test('インデックスを許可するとrobotsメタタグもindex側に切り替わる', () => {
  const directives = buildRobotsDirectives(true);
  assert.equal(directives.index, true);
  assert.equal(directives.follow, true);
  assert.equal(directives.googleBot.index, true);
  assert.equal(directives.googleBot.follow, true);
});

test('インデックスを拒否するとキャッシュもスニペットも止める', () => {
  const directives = buildRobotsDirectives(false);
  assert.equal(directives.index, false);
  assert.equal(directives.follow, false);
  assert.equal(directives.noarchive, true);
  assert.equal(directives.nosnippet, true);
  assert.equal(directives.nocache, true);
  assert.equal(directives.googleBot.index, false);
});

test('未保存のときは従来のハードコード値をそのまま使う', () => {
  const seo = mergeSeoSettings(null);
  assert.equal(seo.siteTitle, 'MOSS COUNTRY - 北海道の苔テラリウム専門店');
  assert.equal(seo.titleTemplate, '%s | MOSS COUNTRY');
  assert.ok(seo.keywords.includes('苔テラリウム'));
});

test('保存された値が優先される', () => {
  const seo = mergeSeoSettings({
    siteTitle: '新しいタイトル',
    description: '新しい説明文',
    keywords: ['苔', 'テラリウム'],
  });
  assert.equal(seo.siteTitle, '新しいタイトル');
  assert.equal(seo.description, '新しい説明文');
  assert.deepEqual(seo.keywords, ['苔', 'テラリウム']);
});

test('全消ししてもタイトルと説明文は空にならない', () => {
  const seo = mergeSeoSettings({ siteTitle: '', description: '   ', keywords: [] });
  assert.equal(seo.siteTitle, defaultSeoSettings.siteTitle);
  assert.equal(seo.description, defaultSeoSettings.description);
  assert.deepEqual(seo.keywords, defaultSeoSettings.keywords);
});

test('SNSシェア用の説明文は検索結果用とは別に持つ', () => {
  // OGPの説明文まで検索向けの長文にすると、SNSでのシェア表示が読みにくくなる
  assert.notEqual(defaultSeoSettings.ogDescription, defaultSeoSettings.description);
  assert.equal(defaultSeoSettings.ogDescription, '小さなガラスの中に広がる、無限の自然の世界');

  const seo = mergeSeoSettings({ description: '検索向けの説明' });
  assert.equal(seo.description, '検索向けの説明');
  assert.equal(seo.ogDescription, defaultSeoSettings.ogDescription);
});

test('OGP画像の既定値はpublic配下に実在するファイルを指す', async () => {
  // 以前 og-image.jpg が存在しないまま参照され、SNSシェア時に画像が404になっていた。
  // 拡張子の付け替えなどで同じ状態に戻らないよう、既定値の実体をここで確認する。
  const url = defaultSeoSettings.ogImageUrl;
  assert.ok(url.startsWith('/images/'), 'public配下の相対パスであること');
  await access(resolve('public', url.replace(/^\//, '')));
});

test('所有権確認コードは空欄のままにでき、ダミー値を出力しない', () => {
  assert.equal(defaultSeoSettings.googleSiteVerification, '');
  assert.equal(mergeSeoSettings({ googleSiteVerification: '' }).googleSiteVerification, '');
  assert.equal(mergeSeoSettings({ googleSiteVerification: ' abc123 ' }).googleSiteVerification, 'abc123');
});

test('GTMコンテナIDは形式が合うものだけ採用する', () => {
  assert.equal(normalizeGtmContainerId('GTM-TVDCWVQ3'), 'GTM-TVDCWVQ3');
  assert.equal(normalizeGtmContainerId(' gtm-tvdcwvq3 '), 'GTM-TVDCWVQ3');
  assert.equal(normalizeGtmContainerId(''), '');
  assert.equal(normalizeGtmContainerId('UA-12345'), '');
  assert.equal(normalizeGtmContainerId('<script>alert(1)</script>'), '');
  assert.equal(normalizeGtmContainerId(null), '');
});

test('不正なGTM IDを保存しても未設定に倒れ、scriptタグを埋め込まない', () => {
  assert.equal(mergeSeoSettings({ gtmContainerId: "');alert(1);//" }).gtmContainerId, '');
});
