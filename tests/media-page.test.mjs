import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { mediaCoverage, featuredMediaCoverage } from '../src/content/mediaCoverage.ts';

const siteSettings = readFileSync('src/lib/siteSettingsDefaults.ts', 'utf8');
const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');

test('メディア掲載情報は日付の新しい順で、出典URL付き', () => {
  assert.ok(mediaCoverage.length >= 10);

  for (const [index, item] of mediaCoverage.entries()) {
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.sourceUrl.startsWith('https://'));
    assert.ok(item.sourceLabel.length > 0);
    for (const link of item.additionalLinks ?? []) {
      assert.ok(link.url.startsWith('https://'));
      assert.ok(link.label.length > 0);
    }

    if (index > 0) {
      assert.ok(mediaCoverage[index - 1].date >= item.date);
    }
  }
});

test('福永探偵社の放送動画と新しい掲載実績へのリンクがある', () => {
  const fukunaga = mediaCoverage.find(item => item.id === 'stv-fukunaga-2025-08-26');
  assert.ok(fukunaga?.additionalLinks?.some(link => link.url === 'https://www.youtube.com/watch?v=QesKWZmfghk'));

  assert.ok(mediaCoverage.some(item => item.sourceUrl === 'https://tsukinuke.jp/1/p/45838'));
  assert.ok(mediaCoverage.some(item => item.sourceUrl.includes('stec4bfb02875f40f7ae9d7d03b047c0d6')));
  assert.ok(mediaCoverage.some(item => item.id === 'fm-maple-radio-hinoatarubasho-2026-02-03'));
  assert.ok(mediaCoverage.some(item => item.sourceUrl === 'https://www.hokkaido-np.co.jp/article/1243111/'));
});
test('トップページには掲載実績への導線と抜粋がある', () => {
  const homePage = readFileSync('src/app/page.tsx', 'utf8');
  const homeSection = readFileSync('src/components/sections/home/MediaHighlightsSection.tsx', 'utf8');

  assert.match(homePage, /<MediaHighlightsSection \/>/);
  assert.match(homeSection, /href="\/media"/);
  assert.equal(featuredMediaCoverage.length, 3);
  assert.ok(featuredMediaCoverage.every(item => item.category === 'テレビ'));
  assert.ok(featuredMediaCoverage.every(item => item.image));
  assert.ok(featuredMediaCoverage.some(item => item.id === 'stv-fukunaga-2025-08-26'));
  assert.ok(!featuredMediaCoverage.some(item => item.id === 'nhk-hotnews-hokkaido-2025-09-22'));
});

test('メディア情報はフッターと検索エンジン向けのサイトマップに掲載する', () => {
  assert.match(siteSettings, /label: 'メディア情報', href: '\/media'/);
  assert.match(sitemap, /\$\{baseUrl\}\/media/);
});

test('掲載実績で指定したローカル画像が存在する', () => {
  for (const item of mediaCoverage) {
    if (!item.image) continue;
    assert.equal(existsSync(`public${item.image}`), true, item.image);
  }
});
