import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('各ワークショップコースへ最大5枚の画像を保存できる', () => {
  const schema = read('sanity/schemas/simpleWorkshop.ts');
  const api = read('src/app/api/admin/workshop-plans/route.ts');
  const admin = read('src/app/admin/workshop-bookings/page.tsx');

  assert.match(schema, /name: 'courseImages'/);
  assert.match(schema, /Rule\.max\(5\)/);
  assert.match(api, /normalizeCourseImages/);
  assert.match(admin, /先頭がメイン画像/);
  assert.match(admin, /compressImageForUpload/);
});

test('公開画面はメイン画像からスワイプ対応ギャラリーを開く', () => {
  const gallery = read('src/components/workshop/WorkshopCourseGallery.tsx');
  const workshop = read('src/app/workshop/page.tsx');
  const booking = read('src/app/workshop/booking/page.tsx');

  assert.match(gallery, /role="dialog"/);
  assert.match(gallery, /onTouchStart/);
  assert.match(gallery, /onTouchEnd/);
  assert.match(gallery, /写真を見る/);
  assert.match(workshop, /WorkshopCourseGallery/);
  assert.match(booking, /WorkshopCourseGallery/);
});
