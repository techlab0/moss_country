import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/actionRequiredDashboard.ts')).href;
const { createActionRequiredDashboardHandler } = await import(moduleUrl);

test('未認証ならデータ件数を問い合わせない', async () => {
  let countCalls = 0;
  const handle = createActionRequiredDashboardHandler({
    verifySession: async () => null,
    countByStatuses: async () => { countCalls += 1; return 0; },
  });

  const result = await handle(new Request('http://localhost/api/admin/dashboard/action-required'));
  assert.equal(result.status, 401);
  assert.equal(countCalls, 0);
});

test('問い合わせはpending、注文は未発送4状態を数える', async () => {
  const calls = [];
  const handle = createActionRequiredDashboardHandler({
    verifySession: async () => ({ userId: 'admin' }),
    countByStatuses: async (table, statuses) => {
      calls.push([table, statuses]);
      return table === 'orders' ? 4 : 2;
    },
  });

  const result = await handle(new Request('http://localhost/api/admin/dashboard/action-required'));
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [
    ['contact_inquiries', ['pending']],
    ['orders', ['pending', 'paid', 'confirmed', 'processing']],
  ]);
  assert.deepEqual(result.body, {
    inquiries: { pending: 2 },
    orders: { pending: 4 },
  });
});

test('一方の集計に失敗したときはその件数だけnullで返す', async () => {
  const handle = createActionRequiredDashboardHandler({
    verifySession: async () => ({ userId: 'admin' }),
    countByStatuses: async (table) => table === 'orders' ? null : 3,
  });

  const result = await handle(new Request('http://localhost/api/admin/dashboard/action-required'));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    inquiries: { pending: 3 },
    orders: { pending: null },
  });
});
