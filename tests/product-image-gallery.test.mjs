import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gallery = readFileSync('src/components/ui/ProductImageGallery.tsx', 'utf8');

test('商品画像を全画面ギャラリーで開閉できる', () => {
  assert.match(gallery, /createPortal/);
  assert.match(gallery, /role="dialog"/);
  assert.match(gallery, /aria-modal="true"/);
  assert.match(gallery, /画像を拡大/);
  assert.match(gallery, /閉じる ×/);
  assert.match(gallery, /document\.documentElement\.style\.overflow = 'hidden'/);
});

test('パソコンで拡大縮小とドラッグ移動ができる', () => {
  assert.match(gallery, /const MAX_SCALE = 4/);
  assert.match(gallery, /onMouseDown/);
  assert.match(gallery, /onMouseMove/);
  assert.match(gallery, /translate3d\(\$\{pan\.x\}px, \$\{pan\.y\}px, 0\) scale\(\$\{scale\}\)/);
  assert.match(gallery, /aria-label="縮小"/);
  assert.match(gallery, /aria-label="拡大"/);
});

test('スマートフォンでピンチ拡大と拡大後の移動ができる', () => {
  assert.match(gallery, /distanceBetweenTouches/);
  assert.match(gallery, /pinchStart/);
  assert.match(gallery, /touchPanStart/);
  assert.match(gallery, /suppressModalClick/);
  assert.match(gallery, /\[touch-action:none\]/);
  assert.match(gallery, /2本指で拡大・縮小できます/);
});

test('等倍時だけ左右スワイプで別画像へ切り替える', () => {
  assert.match(gallery, /modalSwipeStart/);
  assert.match(gallery, /scaleRef\.current > MIN_SCALE/);
  assert.match(gallery, /showPrevious/);
  assert.match(gallery, /showNext/);
});
