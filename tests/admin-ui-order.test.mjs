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

test('レンタルテラリウムをページ編集の対象として公開ページに反映する', async () => {
  const registry = await readFile(resolve(projectRoot, 'src/lib/pageContentRegistry.ts'), 'utf8');
  const publicPage = await readFile(resolve(projectRoot, 'src/app/rental-terrarium/page.tsx'), 'utf8');

  assert.ok(registry.includes('rentalTerrarium: {'), 'レンタルテラリウムの編集定義が必要');
  assert.ok(registry.includes("path: '/rental-terrarium'"), '公開ページのパスを登録する');
  assert.ok(registry.includes("key: 'longTermPlans'"), '長期料金表を編集対象に含める');
  assert.ok(registry.includes("key: 'shortTermPlans'"), '短期料金表を編集対象に含める');
  assert.ok(registry.includes("key: 'planImageMini'"), 'Miniのサイズ写真を編集対象に含める');
  assert.ok(registry.includes("key: 'planImageOrderMade'"), 'Order Madeのサイズ写真を編集対象に含める');
  assert.ok(registry.includes("key: 'terms'"), '契約条件を編集対象に含める');
  assert.ok(publicPage.includes("usePageContent('rentalTerrarium')"), '公開ページで保存内容を読み込む');
  assert.ok(publicPage.includes("img('heroImage')"), 'メイン画像の上書きを公開ページへ反映する');
  assert.ok(publicPage.includes("t('longTermPlans')"), '長期料金表の上書きを公開ページへ反映する');
  assert.ok(publicPage.includes('planImageKeys'), '各サイズ写真を料金表へ反映する');
});

test('ブログの新規作成と編集でアイキャッチ画像を変更できる', async () => {
  const newPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/new/page.tsx'), 'utf8');
  const editPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/[id]/edit/page.tsx'), 'utf8');

  for (const source of [newPage, editPage]) {
    assert.ok(source.includes('アイキャッチ画像'), 'アイキャッチ画像欄を表示する');
    assert.ok(source.includes("'/api/admin/images/upload'"), '認証済み画像APIでアップロードする');
    assert.ok(source.includes('featuredImage: data.image'), 'アップロード画像を記事データへ設定する');
    assert.ok(source.includes('画像を削除'), '画像を削除できる');
  }
  assert.ok(editPage.includes('featuredImage: formData.featuredImage ?? null'), '画像削除を記事保存へ反映する');
});

test('クラフトモスレンタルを編集でき、表示・非表示を切り替えられる', async () => {
  const registry = await readFile(resolve(projectRoot, 'src/lib/pageContentRegistry.ts'), 'utf8');
  const settings = await readFile(resolve(projectRoot, 'src/lib/siteSettingsDefaults.ts'), 'utf8');
  const publicPage = await readFile(resolve(projectRoot, 'src/app/craft-moss-rental/page.tsx'), 'utf8');

  assert.ok(registry.includes('craftMossRental: {'), 'クラフトモスレンタルの編集定義が必要');
  assert.ok(registry.includes("path: '/craft-moss-rental'"), '公開ページのパスを登録する');
  assert.ok(settings.includes("{ path: '/craft-moss-rental', label: 'クラフトモスレンタル' }"), '表示切替の対象に追加する');
  assert.ok(settings.includes("maintenancePages: ['/craft-moss-rental']"), '初期状態は非表示にする');
  assert.ok(publicPage.includes("usePageContent('craftMossRental')"), '公開ページで編集内容を読み込む');
  assert.ok(publicPage.includes("img('heroImage')"), 'メイン画像を編集可能にする');
  assert.ok(publicPage.includes('レンタルサービスを選択'), 'レンタルサービスの切替を表示する');
  assert.ok(publicPage.includes('href="/rental-terrarium"'), 'テラリウムレンタルへ戻れる');

  const terrariumPage = await readFile(resolve(projectRoot, 'src/app/rental-terrarium/page.tsx'), 'utf8');
  assert.ok(terrariumPage.includes('href="/craft-moss-rental"'), 'クラフトモスレンタルへ移動できる');
  assert.ok(
    terrariumPage.indexOf('クラフトモスレンタル') < terrariumPage.indexOf('テラリウムレンタル'),
    'クラフトモスの選択タブを先に表示する',
  );
});
