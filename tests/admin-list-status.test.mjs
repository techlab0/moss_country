import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/adminListStatus.ts')).href;
const {
  buildStatusHref,
  matchesOrderListFilter,
  parseContactStatus,
  parseOrderListFilter,
  saveAdminStatus,
} = await import(moduleUrl);

test('問い合わせと注文のURLステータスを読み、通知用未発送フィルターは4状態に一致する', () => {
  assert.equal(parseContactStatus('pending'), 'pending');
  assert.equal(parseContactStatus('unknown'), '');
  assert.equal(parseOrderListFilter('unshipped'), 'unshipped');
  assert.equal(parseOrderListFilter('unknown'), 'all');
  for (const status of ['pending', 'paid', 'confirmed', 'processing']) {
    assert.equal(matchesOrderListFilter(status, 'unshipped'), true);
  }
  for (const status of ['shipped', 'delivered', 'cancelled', 'refunded']) {
    assert.equal(matchesOrderListFilter(status, 'unshipped'), false);
  }
});

test('URLのstatusを更新し、フィルター解除でstatusだけを取り除く', () => {
  assert.equal(
    buildStatusHref('/admin/contacts', '?priority=high', 'pending'),
    '/admin/contacts?priority=high&status=pending',
  );
  assert.equal(
    buildStatusHref('/admin/orders', '?status=unshipped&view=compact', 'all', 'all'),
    '/admin/orders?view=compact',
  );
});

test('ステータス保存は既存のAPI、HTTP method、status payloadを使い、失敗時にrejectする', async () => {
  let request;
  await saveAdminStatus(async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 200 });
  }, '/api/admin/contacts/contact-1', 'PUT', 'resolved');
  assert.equal(request.url, '/api/admin/contacts/contact-1');
  assert.equal(request.options.method, 'PUT');
  assert.deepEqual(JSON.parse(request.options.body), { status: 'resolved' });

  await assert.rejects(
    saveAdminStatus(async () => new Response(null, { status: 500 }), '/api/admin/orders/order-1', 'PATCH', 'shipped'),
    /ステータスの更新に失敗しました/,
  );
});

test('要対応通知から問い合わせpendingと注文unshippedの一覧へ移動する', async () => {
  const strip = await readFile(resolve('src/components/admin/ActionRequiredStrip.tsx'), 'utf8');
  assert.match(strip, /href: '\/admin\/contacts\?status=pending'/);
  assert.match(strip, /href: '\/admin\/orders\?status=unshipped'/);
});
