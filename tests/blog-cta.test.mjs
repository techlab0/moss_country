import assert from 'node:assert/strict';
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
        { _key: 'first', label: '商品を見る', url: '/shop/item' },
        { _key: 'second', label: '予約する', url: '/workshop/booking' },
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
