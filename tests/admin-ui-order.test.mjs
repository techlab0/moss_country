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

test('ワークショップ予約の自動返信メールを管理画面から編集できる', async () => {
  const adminPage = await readFile(resolve(projectRoot, 'src/app/admin/workshop-bookings/page.tsx'), 'utf8');
  const settingsApi = await readFile(resolve(projectRoot, 'src/app/api/admin/workshop-email-settings/route.ts'), 'utf8');
  const bookingApi = await readFile(resolve(projectRoot, 'src/app/api/workshop/book/route.ts'), 'utf8');
  const settingsLib = await readFile(resolve(projectRoot, 'src/lib/workshopEmailSettings.ts'), 'utf8');

  assert.ok(adminPage.includes("label: '自動返信メール'"), '予約管理に自動返信メールタブを表示する');
  assert.ok(adminPage.includes("fetch('/api/admin/workshop-email-settings'"), '管理画面から設定APIを利用する');
  assert.ok(settingsApi.includes('verifyAdminSession'), '設定APIは管理者認証を必須にする');
  assert.ok(settingsApi.includes('件名と本文は必須です'), '空のメール設定を保存させない');
  assert.ok(settingsLib.includes("WORKSHOP_EMAIL_SETTINGS_KEY = 'workshop_confirmation_email'"), '既存の設定ストアへ保存する');
  assert.ok(settingsLib.includes("'{{bookingNumber}}'"), '予約情報の差し込み文字を用意する');
  assert.ok(bookingApi.includes('customerEmailSubject'), '顧客メールへ編集した件名を反映する');
  assert.ok(bookingApi.includes('customerEmailBody'), '顧客メールへ編集した本文を反映する');
  assert.ok(bookingApi.includes('defaultEmailBody'), '店舗通知メールは既定の本文を維持する');
});

test('ヘッダーの商品タブをホームの直後に表示する', async () => {
  const header = await readFile(resolve(projectRoot, 'src/components/layout/Header.tsx'), 'utf8');

  assert.ok(header.includes("savedShopLink = links.find(link => link.href === '/shop')"), '保存済みの商品リンク設定を引き継ぐ');
  assert.ok(header.includes("homeIndex = navigation.findIndex(link => link.href === '/')"), 'ホームの位置を基準にする');
  assert.ok(header.includes('homeIndex + 1'), '商品タブをホームの直後に挿入する');
  assert.ok(header.includes("href: '/shop'"), '商品タブは商品一覧へ移動する');
  assert.ok(header.includes("link.href !== '/shop'"), '保存済みの商品リンクと重複させない');
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

test('ブログのアイキャッチ画像へ管理画面で指定した表示位置を反映する', async () => {
  const listPage = await readFile(resolve(projectRoot, 'src/app/blog/page.tsx'), 'utf8');
  const detailPage = await readFile(resolve(projectRoot, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const positionHelper = await readFile(resolve(projectRoot, 'src/lib/imagePosition.ts'), 'utf8');
  const newPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/new/page.tsx'), 'utf8');
  const editPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/[id]/edit/page.tsx'), 'utf8');
  const schema = await readFile(resolve(projectRoot, 'sanity/schemas/blogPost.ts'), 'utf8');

  for (const source of [listPage, detailPage]) {
    assert.ok(source.includes('imageObjectPosition(post.featuredImage)'), '保存した画像位置を公開画像へ反映する');
  }
  assert.ok(!listPage.includes('.width(400).height(300)'), '一覧画像を表示前に固定比率で切り抜かない');
  assert.ok(!detailPage.includes('.width(800).height(450)'), '詳細画像を表示前に固定比率で切り抜かない');
  assert.ok(positionHelper.includes('Math.min(1, Math.max(0'), '画像位置を有効範囲内に制限する');
  assert.ok(positionHelper.includes('imageDisplayScale'), '画像サイズを有効範囲内に制限する');
  assert.ok(newPage.includes('<ImagePositionControls allowScale'), '新規投稿で画像サイズを調整できる');
  assert.ok(editPage.includes('<ImagePositionControls allowScale'), '記事編集で画像サイズを調整できる');
  assert.ok(listPage.includes('imageDisplayScale(post.featuredImage)'), '一覧へ画像サイズを反映する');
  assert.ok(detailPage.includes('imageDisplayScale(post.featuredImage)'), '詳細へ画像サイズを反映する');
  assert.ok(schema.includes("name: 'displayScale'"), '画像ごとのサイズをSanityへ保存する');
});

test('ブログ編集で既存本文を取得し、本文欠損時は概要を表示する', async () => {
  const sanity = await readFile(resolve(projectRoot, 'src/lib/sanity.ts'), 'utf8');
  const detailPage = await readFile(resolve(projectRoot, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const editPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/[id]/edit/page.tsx'), 'utf8');
  const adminDetailApi = await readFile(resolve(projectRoot, 'src/app/api/admin/blog/[id]/route.ts'), 'utf8');
  const adminQueryStart = sanity.indexOf('export async function getAllBlogPosts');
  const adminQueryEnd = sanity.indexOf('export async function createBlogPost', adminQueryStart);

  assert.ok(adminQueryStart >= 0 && adminQueryEnd > adminQueryStart, '管理画面の記事取得処理が必要');
  assert.ok(sanity.slice(adminQueryStart, adminQueryEnd).includes('content,'), '編集時に既存本文を取得する');
  assert.ok(sanity.includes('export async function getBlogPostById'), '記事1件を最新状態で取得する');
  assert.ok(adminDetailApi.includes('export async function GET'), '記事編集用の詳細取得APIが必要');
  assert.ok(editPage.includes('`/api/admin/blog/${postId}`'), '編集画面では対象記事だけを取得する');
  assert.ok(editPage.includes('...(contentChanged ? {'), '本文を変更した場合だけ本文を保存対象にする');
  assert.ok(editPage.includes("window.confirm('本文が空です。"), '本文削除時は確認を表示する');
  assert.ok(detailPage.includes('const hasBody = Array.isArray(post.content)'), '本文の有無を判定する');
  assert.ok(detailPage.includes('{post.excerpt}'), '本文が空なら概要文を救済表示する');
});

test('ブログ記事ごとに任意の案内ボタンを設定して公開画面へ表示できる', async () => {
  const newPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/new/page.tsx'), 'utf8');
  const editPage = await readFile(resolve(projectRoot, 'src/app/admin/blog/[id]/edit/page.tsx'), 'utf8');
  const detailPage = await readFile(resolve(projectRoot, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const schema = await readFile(resolve(projectRoot, 'sanity/schemas/blogPost.ts'), 'utf8');
  const sanity = await readFile(resolve(projectRoot, 'src/lib/sanity.ts'), 'utf8');
  const createApi = await readFile(resolve(projectRoot, 'src/app/api/admin/blog/route.ts'), 'utf8');
  const updateApi = await readFile(resolve(projectRoot, 'src/app/api/admin/blog/[id]/route.ts'), 'utf8');

  for (const source of [newPage, editPage]) {
    assert.ok(source.includes('記事下の案内ボタン'), '管理画面に案内ボタン設定欄を表示する');
    assert.ok(source.includes('name="ctaLabel"'), 'ボタン文字を入力できる');
    assert.ok(source.includes('name="ctaUrl"'), '移動先URLを入力できる');
    assert.ok(source.includes('normalizeBlogCtaFields(formData)'), '保存前に入力内容を検証する');
  }
  assert.ok(schema.includes("name: 'ctaLabel'"), 'ボタン文字をSanityへ保存する');
  assert.ok(schema.includes("name: 'ctaUrl'"), '移動先URLをSanityへ保存する');
  assert.ok(sanity.includes('ctaLabel,'), '記事取得時にボタン文字を含める');
  assert.ok(sanity.includes('ctaUrl,'), '記事取得時に移動先URLを含める');
  assert.ok(createApi.includes('normalizeBlogCtaFields(data)'), '新規作成APIでもURLを検証する');
  assert.ok(updateApi.includes('normalizeBlogCtaFields(data)'), '更新APIでもURLを検証する');
  assert.ok(detailPage.includes('getBlogCta(post)'), '公開前にも保存値を検証する');
  assert.ok(detailPage.includes('記事に関連するページはこちら'), '記事末尾に案内ボタンを表示する');
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
    terrariumPage.indexOf('苔テラリウムレンタル') < terrariumPage.indexOf('クラフトモスレンタル'),
    '苔テラリウムを左、クラフトモスを右に表示する',
  );
});

test('フッターのサイトマップにレンタルテラリウムを追加する', async () => {
  const settings = await readFile(resolve(projectRoot, 'src/lib/siteSettingsDefaults.ts'), 'utf8');
  const adminApi = await readFile(resolve(projectRoot, 'src/app/api/admin/site-settings/route.ts'), 'utf8');

  assert.ok(settings.includes("{ label: 'レンタルテラリウム', href: '/rental-terrarium', isVisible: true }"), '既定のサイトマップにリンクを追加する');
  assert.ok(settings.includes('rentalTerrariumSitemapConfigured'), '既存設定にも一度だけリンクを追加する');
  assert.ok(adminApi.includes('rentalTerrariumSitemapConfigured: true'), '管理画面で保存後は表示設定を尊重する');
});

test('ページ編集画像の表示位置を調整して公開ページへ反映できる', async () => {
  const editor = await readFile(resolve(projectRoot, 'src/app/admin/pages/page.tsx'), 'utf8');
  const schema = await readFile(resolve(projectRoot, 'sanity/schemas/pageContent.ts'), 'utf8');
  const publicApi = await readFile(resolve(projectRoot, 'src/app/api/page-content/route.ts'), 'utf8');
  const hook = await readFile(resolve(projectRoot, 'src/hooks/usePageContent.ts'), 'utf8');

  assert.ok(editor.includes('横位置：'), '横位置を調整する操作が必要');
  assert.ok(editor.includes('縦位置：'), '縦位置を調整する操作が必要');
  assert.ok(schema.includes("name: 'positionX'"), '横位置をSanityへ保存する');
  assert.ok(schema.includes("name: 'positionY'"), '縦位置をSanityへ保存する');
  assert.ok(publicApi.includes('positionX'), '公開APIが表示位置を返す');
  assert.ok(hook.includes('imgStyle'), '公開ページへ表示位置を適用する');
});

test('各画像管理画面で画像の表示位置を調整できる', async () => {
  const files = [
    'src/app/admin/images/page.tsx',
    'src/app/admin/products/new/page.tsx',
    'src/app/admin/products/[id]/edit/page.tsx',
    'src/app/admin/blog/new/page.tsx',
    'src/app/admin/blog/[id]/edit/page.tsx',
    'src/app/admin/moss-guide/new/page.tsx',
    'src/app/admin/moss-guide/[id]/edit/page.tsx',
  ];
  const contents = await Promise.all(files.map(file => readFile(resolve(projectRoot, file), 'utf8')));

  for (const content of contents) {
    assert.ok(content.includes('ImagePositionControls'), '共通の画像位置調整を表示する');
  }
});
