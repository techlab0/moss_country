import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const galleryContent = fs.readFileSync(path.join(root, 'src/content/mossGallery.ts'), 'utf8');
const galleryComponent = fs.readFileSync(path.join(root, 'src/components/moss-gallery/MossGallery.tsx'), 'utf8');
const galleryPage = fs.readFileSync(path.join(root, 'src/app/moss-gallery/page.tsx'), 'utf8');
const mossBasicsPage = fs.readFileSync(path.join(root, 'src/app/moss-basics/page.tsx'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'src/components/layout/Footer.tsx'), 'utf8');

test('苔風景写真集は重複を除いた91枚を固定管理する', () => {
  const referencedPhotos = [...galleryContent.matchAll(/^  ".+\.(?:jpg|jpeg|png|webp)",$/gim)];
  assert.equal(referencedPhotos.length, 91);
  assert.doesNotMatch(galleryContent, /\(1\)\.jpg/);
});

test('写真集は12枚ずつ表示し、拡大表示に対応する', () => {
  assert.match(galleryComponent, /const PAGE_SIZE = 12/);
  assert.match(galleryComponent, /もっと見る/);
  assert.match(galleryComponent, /role="dialog"/);
  assert.match(galleryComponent, /sizes="\(max-width: 639px\)/);
  assert.match(galleryPage, /<MossGallery photos=\{mossGalleryPhotos\}/);
});

test('苔を知るページとフッターから写真集へ移動できる', () => {
  assert.match(mossBasicsPage, /href="\/moss-gallery"/);
  assert.match(footer, /href="\/moss-gallery"/);
});
