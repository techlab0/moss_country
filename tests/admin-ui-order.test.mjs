import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

test('ダッシュボードの管理カード6件をセキュリティ情報より前に表示する', async () => {
  const source = await readFile(resolve(projectRoot, 'src/app/admin/dashboard/page.tsx'), 'utf8');
  const managementCardsAt = source.indexOf('<ContentManagementCards />');
  const securityAlertsAt = source.indexOf('{/* セキュリティアラート */}');
  const cardTitles = [
    'ブログ・ニュース管理',
    'カレンダー管理',
    'FAQ管理',
    '画像管理',
    'ページ編集',
    'お問い合わせ管理',
  ];

  assert.ok(managementCardsAt >= 0, '管理カード一覧が必要');
  assert.ok(securityAlertsAt > managementCardsAt, '管理カード一覧をセキュリティ情報より前に表示する');
  for (const title of cardTitles) {
    const titleAt = source.indexOf(`<h3 className="text-lg font-semibold text-gray-900">${title}</h3>`);
    assert.ok(titleAt >= 0, `${title}カードが必要`);
  }
});

test('サイドメニューの画像管理をページ編集とサイト設定の間に表示する', async () => {
  const source = await readFile(resolve(projectRoot, 'src/components/admin/AdminLayout.tsx'), 'utf8');
  const pagesAt = source.indexOf("{ name: 'ページ編集'");
  const imagesAt = source.indexOf("{ name: '画像管理'");
  const settingsAt = source.indexOf("{ name: 'サイト設定'");

  assert.ok(pagesAt >= 0 && imagesAt >= 0 && settingsAt >= 0, '対象メニュー3件が必要');
  assert.ok(pagesAt < imagesAt, '画像管理はページ編集より後に表示する');
  assert.ok(imagesAt < settingsAt, '画像管理はサイト設定より前に表示する');
});

test('出張ワークショップをページ編集の対象として公開ページに反映する', async () => {
  const registry = await readFile(resolve(projectRoot, 'src/lib/pageContentRegistry.ts'), 'utf8');
  const publicPage = await readFile(resolve(projectRoot, 'src/app/workshop/mobile/page.tsx'), 'utf8');
  const adminPage = await readFile(resolve(projectRoot, 'src/app/admin/pages/page.tsx'), 'utf8');
  const adminLayout = await readFile(resolve(projectRoot, 'src/components/admin/AdminLayout.tsx'), 'utf8');

  assert.ok(registry.includes('mobileWorkshop: {'), '出張ワークショップの編集定義が必要');
  assert.ok(registry.includes("path: '/workshop/mobile'"), '公開ページのパスを登録する');
  assert.ok(registry.includes('`menu${number}Image`'), 'メニュー画像を編集対象に含める');
  assert.ok(registry.includes('importantNotes'), '注意事項を編集対象に含める');
  assert.ok(publicPage.includes("usePageContent('mobileWorkshop')"), '公開ページで保存内容を読み込む');
  assert.ok(publicPage.includes("img('aboutImage')"), '紹介画像の上書きを公開ページへ反映する');
  assert.ok(adminPage.includes("get('page')"), 'URLから編集対象ページを選べる');
  const dedicatedPage = await readFile(resolve(projectRoot, 'src/app/admin/mobile-workshop/page.tsx'), 'utf8');
  assert.ok(adminLayout.includes("href: '/admin/mobile-workshop'"), '管理メニューに専用入口を表示する');
  assert.ok(dedicatedPage.includes("redirect('/admin/pages?page=mobileWorkshop')"), '専用画面は出張ワークショップ編集へ転送する');
});
