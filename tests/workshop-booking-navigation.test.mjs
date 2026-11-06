import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bookingPagePath = new URL('../src/app/workshop/booking/page.tsx', import.meta.url);
const workshopPagePath = new URL('../src/app/workshop/page.tsx', import.meta.url);
const paypayReturnPagePath = new URL('../src/app/workshop/booking/paypay/return/page.tsx', import.meta.url);

test('booking steps return the viewport to the booking heading', async () => {
  const bookingPage = await readFile(bookingPagePath, 'utf8');

  assert.ok(bookingPage.includes('const moveToStep = (nextStep: Step) =>'));
  assert.ok(bookingPage.includes('bookingTopRef.current?.scrollIntoView'));
  assert.ok(bookingPage.includes('ref={bookingTopRef}'));
  assert.equal(bookingPage.match(/setStep\(/g)?.length, 2);
  assert.ok(bookingPage.includes('moveToStep(2);'));
  assert.ok(bookingPage.includes('moveToStep(3);'));
  assert.ok(bookingPage.includes('moveToStep(4);'));
  assert.ok(bookingPage.includes('moveToStep(5);'));
});

test('workshop reservation and contact links use consistent destinations', async () => {
  const [bookingPage, workshopPage, paypayReturnPage] = await Promise.all([
    readFile(bookingPagePath, 'utf8'),
    readFile(workshopPagePath, 'utf8'),
    readFile(paypayReturnPagePath, 'utf8'),
  ]);

  assert.equal(workshopPage.match(/router\.push\('\/workshop\/booking'\)/g)?.length, 3);
  assert.ok(!workshopPage.includes("window.location.href = '/workshop/booking'"));
  assert.ok(workshopPage.includes("router.push('/workshop/mobile')"));
  assert.ok(!workshopPage.includes("window.location.href = '/workshop/mobile'"));
  assert.ok(bookingPage.includes("const CONTACT_FORM_URL = '/contact#contact-form'"));
  assert.ok(bookingPage.includes('href="/contact#contact-form"'));
  assert.equal(paypayReturnPage.match(/href="\/contact#contact-form"/g)?.length, 3);
});

test('maintenance pricing clearly explains beginner-course participation', async () => {
  const bookingPage = await readFile(bookingPagePath, 'utf8');

  assert.ok(bookingPage.includes('初心者コース参加'));
  assert.ok(bookingPage.includes('初心者コース未参加'));
  assert.ok(bookingPage.includes('初心者コースを受講したことがある方'));
  assert.ok(bookingPage.includes('初心者コースをまだ受講していない方'));
  assert.ok(!bookingPage.includes('基本コース参加者'));
  assert.ok(!bookingPage.includes('基本コース未参加'));
});
