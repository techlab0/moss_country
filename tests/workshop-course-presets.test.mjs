import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { workshopCoursePresets } from '../src/lib/workshopCoursePresets.ts';

test('指定コースは通常17件とメンテナンス5件をすべて非表示で用意する', () => {
  assert.equal(workshopCoursePresets.length, 22);
  assert.equal(workshopCoursePresets.filter((plan) => plan.category === 'terrarium').length, 17);
  assert.equal(workshopCoursePresets.filter((plan) => plan.category === 'maintenance').length, 5);
  assert.ok(workshopCoursePresets.every((plan) => plan.status === 'hidden'));
});

test('メンテナンス会はサイズごとに参加者・未参加料金を持つ', () => {
  const expected = [
    ['ガラスキャニスターSS', 1800, 2100],
    ['ガラスボールS', 2900, 3400],
    ['ポップジャー', 3600, 4200],
    ['ガラスボールM', 6200, 7100],
    ['ガラスボールL または ガラスボックス', 10000, 12000],
  ];

  const maintenance = workshopCoursePresets.filter((plan) => plan.category === 'maintenance');
  assert.deepEqual(
    maintenance.map((plan) => [plan.containerName, plan.participantPrice, plan.nonParticipantPrice]),
    expected
  );
  assert.ok(maintenance.every((plan) => plan.pricingMode === 'maintenance'));

  const combined = maintenance.at(-1);
  assert.deepEqual(combined.containerKeys, ['glass-ball-l', 'glass-box']);
  assert.match(combined.description, /要相談/);
});

test('メンテナンス会の案内文を編集して公開ページへ表示できる', () => {
  const registry = fs.readFileSync('src/lib/pageContentRegistry.ts', 'utf8');
  const workshopPage = fs.readFileSync('src/app/workshop/page.tsx', 'utf8');
  const adminPage = fs.readFileSync('src/app/admin/workshop-bookings/page.tsx', 'utf8');

  for (const key of ['maintenanceTitle', 'maintenanceLead', 'maintenanceParticipantLabel', 'maintenanceNonParticipantLabel']) {
    assert.match(registry, new RegExp(`key: '${key}'`));
    assert.match(workshopPage, new RegExp(`t\\('${key}'\\)`));
  }
  assert.match(workshopPage, /plan\.description/);
  assert.match(workshopPage, /plan\.mossTypes/);
  assert.match(workshopPage, /plan\.priceNote/);
  assert.match(adminPage, /説明（公開ページ・予約画面に表示）/);
});

test('代表コースの価格・苔・付属品を保持する', () => {
  const farm = workshopCoursePresets.find((plan) => plan._id === 'workshop-s-farm');
  assert.equal(farm?.price, 5500);
  assert.match(farm?.mossTypes || '', /コツボゴケ/);
  assert.match(farm?.includedItems || '', /牛フィギュア×2/);

  const large = workshopCoursePresets.find((plan) => plan._id === 'workshop-l-free');
  assert.equal(large?.price, 18000);
  assert.match(large?.mossTypes || '', /コウヤノマンネングサ/);
});
