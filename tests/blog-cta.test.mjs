import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BLOG_CTA_MAX_ITEMS,
  getBlogCtaInputs,
  getBlogCtas,
  normalizeBlogCtaFields,
  normalizeBlogCtaUrl,
} from '../src/lib/blogCta.ts';

test('ブログ案内ボタンはサイト内ページとHTTPSページを許可する', () => {
  assert.equal(normalizeBlogCtaUrl('/shop/forest-terrarium'), '/shop/forest-terrarium');
  assert.equal(normalizeBlogCtaUrl('https://mosscountry.com/workshop/booking'), 'https://mosscountry.com/workshop/booking');
  assert.equal(normalizeBlogCtaUrl('http://example.com/page'), null);
});

test('ブログ案内ボタンは危険または曖昧なURLを拒否する', () => {
  assert.equal(normalizeBlogCtaUrl('javascript:alert(1)'), null);
  assert.equal(normalizeBlogCtaUrl('//example.com/page'), null);
  assert.equal(normalizeBlogCtaUrl('shop/item'), null);
  assert.equal(normalizeBlogCtaUrl('/shop/item name'), null);
});

test('複数ボタンを入力順のまま正規化して旧形式を空にする', () => {
  assert.deepEqual(normalizeBlogCtaFields({
    ctaLinks: [
      { _key: 'first', label: ' 商品を見る ', url: ' /shop/item ' },
      { _key: 'second', label: '予約する', url: '/workshop/booking' },
    ],
  }), {
    ok: true,
    fields: {
      ctaLinks: [
        { _key: 'first', label: '商品を見る', url: '/shop/item', product: null },
        { _key: 'second', label: '予約する', url: '/workshop/booking', product: null },
      ],
      ctaLabel: null,
      ctaUrl: null,
    },
  });
});

test('不完全なボタンと上限超過を保存させない', () => {
  assert.equal(normalizeBlogCtaFields({ ctaLinks: [{ label: '商品を見る', url: '' }] }).ok, false);
  assert.equal(normalizeBlogCtaFields({
    ctaLinks: Array.from({ length: BLOG_CTA_MAX_ITEMS + 1 }, (_, index) => ({
      label: `ボタン${index + 1}`,
      url: `/shop/item-${index + 1}`,
    })),
  }).ok, false);
});

test('商品を選んだボタンは商品参照を保存しURL入力を不要にする', () => {
  assert.deepEqual(normalizeBlogCtaFields({
    ctaLinks: [{
      _key: 'product-card',
      label: 'この商品を見る',
      url: '',
      product: { _type: 'reference', _ref: 'product-123' },
    }],
  }), {
    ok: true,
    fields: {
      ctaLinks: [{
        _key: 'product-card',
        label: 'この商品を見る',
        url: null,
        product: { _type: 'reference', _ref: 'product-123' },
      }],
      ctaLabel: null,
      ctaUrl: null,
    },
  });
});

test('旧1個用設定を編集画面と公開画面で引き継ぐ', () => {
  assert.deepEqual(getBlogCtaInputs({ ctaLabel: '予約する', ctaUrl: '/workshop/booking' }), [
    { _key: 'legacy-cta', label: '予約する', url: '/workshop/booking' },
  ]);
  assert.deepEqual(getBlogCtas({ ctaLabel: '予約する', ctaUrl: '/workshop/booking' }), [{
    key: 'legacy-cta',
    label: '予約する',
    url: '/workshop/booking',
    external: false,
  }]);
});

test('公開画面は有効な複数ボタンだけを表示する', () => {
  assert.deepEqual(getBlogCtas({
    ctaLinks: [
      { _key: 'valid', label: '商品を見る', url: '/shop/item' },
      { _key: 'invalid', label: '危険なリンク', url: 'javascript:alert(1)' },
    ],
  }), [{ key: 'valid', label: '商品を見る', url: '/shop/item', external: false }]);
});

test('公開画面は展開された最新の商品情報から画像とURLを組み立てる', () => {
  const image = { _type: 'image', asset: { _type: 'reference', _ref: 'image-123' } };
  assert.deepEqual(getBlogCtas({
    ctaLinks: [{
      _key: 'product-card',
      label: '商品を見る',
      product: {
        _id: 'product-123',
        name: '森のテラリウム',
        slug: { current: 'forest-terrarium' },
        images: [image],
        isVisible: true,
      },
    }],
  }), [{
    key: 'product-card',
    label: '商品を見る',
    url: '/shop/forest-terrarium',
    external: false,
    product: { id: 'product-123', name: '森のテラリウム', image },
  }]);
});

test('非公開商品はブログの商品カードへ表示しない', () => {
  assert.deepEqual(getBlogCtas({
    ctaLinks: [{
      label: '商品を見る',
      product: {
        _id: 'hidden-product',
        name: '非公開商品',
        slug: { current: 'hidden-product' },
        isVisible: false,
      },
    }],
  }), []);
});

test('ブログ記事は汎用の共有ボタンを表示し、非対応環境ではURLをコピーする', async () => {
  const [button, detailPage] = await Promise.all([
    readFile(new URL('../src/components/blog/BlogShareButton.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/blog/[slug]/page.tsx', import.meta.url), 'utf8'),
  ]);

  assert.ok(button.includes('navigator.share'), 'スマートフォンなどの共有機能を利用する');
  assert.ok(button.includes('navigator.clipboard.writeText'), '共有非対応時はURLをコピーする');
  assert.ok(button.includes('>\n        共有\n'), 'ボタン名は「共有」にする');
  assert.ok(!button.includes('Instagramで共有'), 'Instagram専用の表記にしない');
  assert.ok(!button.includes('window.location.href'), 'ブラウザ上の不確実なURLを共有に使わない');
  assert.ok(!button.includes('text:'), '携帯電話のコピーへタイトルなどの文章を混ぜない');
  assert.ok(!button.includes('title,'), '携帯電話のコピーへ記事タイトルを混ぜない');
  assert.match(button, /navigator\.share\(\{[\s\S]*?url,[\s\S]*?\}\)/, '共有機能には正式URLだけを渡す');
  assert.ok(detailPage.includes('url={`https://mosscountry.com/blog/${encodeURIComponent(slug)}`}'), '該当記事の正式URLを共有ボタンへ渡す');
});

test('ブログの商品紹介カードは縦長画像を切り抜かずクールな枠内へ収める', async () => {
  const detailPage = await readFile(new URL('../src/app/blog/[slug]/page.tsx', import.meta.url), 'utf8');

  assert.ok(detailPage.includes(".width(900).fit('max')"), '商品画像の縦横比を保つ');
  assert.ok(detailPage.includes('object-contain'), '商品画像全体を枠内に収める');
  assert.ok(detailPage.includes('aspect-[4/5]'), '縦長の商品写真に合う表示枠を使う');
  assert.ok(detailPage.includes('Related products'), '商品紹介を独立したセクションとして見せる');
  assert.ok(detailPage.includes("bg-[#0d1711]/95"), '深いグリーンを基調にしたカード背景を使う');
  assert.ok(!detailPage.includes("height(600).fit('crop')"), '横長への強制切り抜きを行わない');
});
