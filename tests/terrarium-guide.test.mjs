import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync('src/app/terrarium-guide/page.tsx', 'utf8');
const homeAbout = readFileSync('src/components/sections/home/AboutSection.tsx', 'utf8');
const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');

test('テラリウム入門ページに必要な案内が揃っている', () => {
  for (const heading of [
    '偶然生まれた、',
    '小さな緑がもたらすもの',
    'いま、テラリウムが',
    'こんな人におすすめです',
    'こんなところに置いてみよう',
    'はじめるのは、',
  ]) {
    assert.match(page, new RegExp(heading));
  }
});

test('効果の断定を避け、参考資料を明記している', () => {
  assert.match(page, /医療行為や治療の代わりではありません/);
  assert.match(page, /感じ方には個人差があります/);
  assert.match(page, /https:\/\/www\.kew\.org/);
  assert.match(page, /https:\/\/pubmed\.ncbi\.nlm\.nih\.gov/);
});

test('商品・体験・店舗への導線とトップページの入口がある', () => {
  assert.match(page, /href="\/shop"/);
  assert.match(page, /href="\/workshop"/);
  assert.match(page, /href="\/store"/);
  assert.match(homeAbout, /href="\/terrarium-guide"/);
  assert.match(sitemap, /\$\{baseUrl\}\/terrarium-guide/);
});
