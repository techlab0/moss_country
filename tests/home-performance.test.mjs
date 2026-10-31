import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { shouldWaitForInitialImage } from '../src/lib/pageLoadingImages.ts';

test('初期ローディングは画面外の遅延画像と先読み背景を待たない', () => {
  const base = {
    loading: 'eager',
    fetchPriority: 'auto',
    top: 100,
    bottom: 500,
    viewportHeight: 800,
  };

  assert.equal(shouldWaitForInitialImage(base), true);
  assert.equal(shouldWaitForInitialImage({ ...base, loading: 'lazy' }), false);
  assert.equal(shouldWaitForInitialImage({ ...base, deferredBackground: true }), false);
  assert.equal(shouldWaitForInitialImage({ ...base, top: 1400, bottom: 1800 }), false);
  assert.equal(shouldWaitForInitialImage({ ...base, fetchPriority: 'high', top: 1400, bottom: 1800 }), true);
});

test('背景画像は一斉に最優先取得せず、近づいたシーンから読み込む', async () => {
  const source = await readFile('src/components/sections/home/SceneBackdrop.tsx', 'utf8');

  assert.match(source, /new Set\(\['about'\]\)/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /rootMargin: '50% 0px 50% 0px'/);
  assert.match(source, /loadedSceneIds\.has\(scene\.id\)/);
  assert.match(source, /fetchPriority="low"/);
  assert.match(source, /data-deferred-home-background="true"/);
  assert.doesNotMatch(source, /fetchPriority="high"/);
});

test('ページ非表示中は常時アニメーション処理を停止する', async () => {
  const [scrollSource, seasonalSource, seasonalCss] = await Promise.all([
    readFile('src/components/sections/home/HomeScrollJourney.tsx', 'utf8'),
    readFile('src/components/sections/home/SeasonalAtmosphere.tsx', 'utf8'),
    readFile('src/components/sections/home/SeasonalAtmosphere.module.css', 'utf8'),
  ]);

  assert.match(scrollSource, /document\.hidden/);
  assert.match(scrollSource, /visibilitychange/);
  assert.match(scrollSource, /window\.cancelAnimationFrame/);
  assert.match(seasonalSource, /visibilitychange/);
  assert.match(seasonalCss, /animation-play-state: paused/);
});

test('画像の読み込み監視は既存のonload処理を上書きしない', async () => {
  const source = await readFile('src/components/providers/PageLoadingProvider.tsx', 'utf8');

  assert.match(source, /shouldWaitForInitialImage/);
  assert.match(source, /addEventListener\('load'/);
  assert.match(source, /addEventListener\('error'/);
  assert.doesNotMatch(source, /img\.onload\s*=/);
});
