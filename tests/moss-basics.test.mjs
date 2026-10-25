import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync('src/app/moss-basics/page.tsx', 'utf8');
const registry = readFileSync('src/lib/pageContentRegistry.ts', 'utf8');
const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');
const siteSettings = readFileSync('src/lib/siteSettingsDefaults.ts', 'utf8');
const homeAbout = readFileSync('src/components/sections/home/AboutSection.tsx', 'utf8');
const adminSettingsApi = readFileSync('src/app/api/admin/site-settings/route.ts', 'utf8');

test('苔の基本ページに必要な説明が揃っている', () => {
  for (const heading of [
    '苔とは',
    '苔の体と、命のつなぎ方',
    'コケ植物の',
    '自然を足もとから支える存在',
    '暮らしの中で育てる基本',
    '苔についての',
  ]) {
    assert.match(registry, new RegExp(heading));
  }
});

test('苔図鑑とテラリウム入門ページへの導線がある', () => {
  assert.match(page, /href="\/moss-guide"/);
  assert.match(page, /href="\/terrarium-guide"/);
});

test('管理画面から文言と画像を編集できる', () => {
  assert.match(registry, /mossBasics:\s*\{/);
  assert.match(registry, /path: '\/moss-basics'/);
  assert.match(registry, /key: 'heroImage'.+type: 'image'/);
  assert.match(registry, /key: 'natureImage'.+type: 'image'/);
  assert.match(page, /usePageContent\('mossBasics'\)/);
  assert.match(page, /img\('heroImage'\)/);
  assert.match(page, /t\('heroTitle'\)/);
});

test('初期状態は非表示で、管理画面から公開状態を保存できる', () => {
  assert.match(siteSettings, /maintenancePages: \['\/craft-moss-rental', '\/moss-basics'\]/);
  assert.match(siteSettings, /\{ path: '\/moss-basics', label: '苔を知る' \}/);
  assert.match(siteSettings, /mossBasicsVisibilityConfigured/);
  assert.match(adminSettingsApi, /mossBasicsVisibilityConfigured: true/);
  assert.match(siteSettings, /mossBasicsSitemapConfigured/);
  assert.match(adminSettingsApi, /mossBasicsSitemapConfigured: true/);
  assert.match(sitemap, /mossBasicsVisibilityConfigured/);
});

test('公開後の入口と検索用サイトマップを用意している', () => {
  assert.match(homeAbout, /href="\/moss-basics"/);
  assert.match(homeAbout, /showMossBasicsLink/);
  assert.match(siteSettings, /\{ label: '苔を知る', href: '\/moss-basics', isVisible: true \}/);
  assert.match(sitemap, /\$\{baseUrl\}\/moss-basics/);
});
