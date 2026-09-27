import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/homeSeason.ts')).href;
const { getHomeSeason } = await import(moduleUrl);

test('一般的な3か月区切りで春夏秋冬を判定する', () => {
  assert.deepEqual(
    Array.from({ length: 12 }, (_, index) => getHomeSeason(index + 1)),
    ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']
  );
});

test('範囲外の月は受け付けない', () => {
  assert.throws(() => getHomeSeason(0), /1〜12/);
  assert.throws(() => getHomeSeason(13), /1〜12/);
});

test('季節演出はトップページ限定で、操作と動作軽減設定を妨げない', async () => {
  const [page, component, css] = await Promise.all([
    readFile('src/app/page.tsx', 'utf8'),
    readFile('src/components/sections/home/SeasonalAtmosphere.tsx', 'utf8'),
    readFile('src/components/sections/home/SeasonalAtmosphere.module.css', 'utf8'),
  ]);

  assert.match(page, /<SeasonalAtmosphere \/>/);
  assert.match(component, /aria-hidden="true"/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /nth-child\(n \+ 12\)/);
});
