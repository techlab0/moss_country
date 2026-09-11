import assert from 'node:assert/strict';
import test from 'node:test';

import { getBlogCta, normalizeBlogCtaFields, normalizeBlogCtaUrl } from '../src/lib/blogCta.ts';

test('ブログ案内ボタンはサイト内ページとHTTPSページを許可する', () => {
  assert.equal(normalizeBlogCtaUrl('/shop/forest-terrarium'), '/shop/forest-terrarium');
  assert.equal(normalizeBlogCtaUrl('https://mosscountry.com/workshop/booking'), 'https://mosscountry.com/workshop/booking');
  assert.equal(normalizeBlogCtaUrl('http://example.com/page'), null);
});

test('ブログ案内ボタンは危険または曖昧なURLを拒否する', () => {
  assert.equal(normalizeBlogCtaUrl('javascript:alert(1)'), null);
  assert.equal(normalizeBlogCtaUrl('//example.com/page'), null);
  assert.equal(normalizeBlogCtaUrl('shop/item'), null);
});

test('ボタン文字とURLは両方入力するか両方空欄にする', () => {
  assert.deepEqual(normalizeBlogCtaFields({ ctaLabel: '', ctaUrl: '' }), {
    ok: true,
    fields: { ctaLabel: null, ctaUrl: null },
  });
  assert.equal(normalizeBlogCtaFields({ ctaLabel: '商品を見る', ctaUrl: '' }).ok, false);
  assert.deepEqual(normalizeBlogCtaFields({ ctaLabel: ' 商品を見る ', ctaUrl: ' /shop/item ' }), {
    ok: true,
    fields: { ctaLabel: '商品を見る', ctaUrl: '/shop/item' },
  });
});

test('公開用ボタンは有効な設定が揃った場合だけ返す', () => {
  assert.equal(getBlogCta({}), null);
  assert.deepEqual(getBlogCta({ ctaLabel: '予約する', ctaUrl: '/workshop/booking' }), {
    label: '予約する',
    url: '/workshop/booking',
    external: false,
  });
});
