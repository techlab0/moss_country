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
