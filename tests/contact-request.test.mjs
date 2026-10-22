import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/contactRequest.ts')).href;
const { fetchContactPage } = await import(moduleUrl);

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => { resolvePromise = resolveValue; });
  return { promise, resolve: resolvePromise };
}

test('古い問い合わせ一覧のfetchがabortを無視して遅れて返っても適用しない', async () => {
  const oldResponse = deferred();
  const newResponse = deferred();
  const oldController = new AbortController();
  const newController = new AbortController();
  let oldActive = true;
  let newActive = true;
  const fetcher = (url) => url.includes('status=old') ? oldResponse.promise : newResponse.promise;

  const oldLoad = fetchContactPage(
    fetcher,
    '/api/admin/contacts?status=old',
    oldController.signal,
    () => oldActive && !oldController.signal.aborted,
  );
  oldActive = false;
  oldController.abort();

  const newLoad = fetchContactPage(
    fetcher,
    '/api/admin/contacts?status=pending',
    newController.signal,
    () => newActive && !newController.signal.aborted,
  );
  newResponse.resolve(new Response(JSON.stringify({ contacts: ['latest'] }), { status: 200 }));
  assert.deepEqual(await newLoad, { contacts: ['latest'] });

  // Mock fetch intentionally resolves despite the aborted signal.
  oldResponse.resolve(new Response(JSON.stringify({ contacts: ['stale'] }), { status: 200 }));
  assert.equal(await oldLoad, null);
  assert.equal(newActive, true);
});
