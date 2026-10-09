export type WorkshopPlanStatus = 'active' | 'paused' | 'hidden';
export type WorkshopPlanCategory = 'terrarium' | 'maintenance' | 'legacy';

export interface WorkshopCoursePreset {
  _id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  category: WorkshopPlanCategory;
  containerKey: string;
  containerKeys: string[];
  containerName: string;
  courseName: string;
  mossTypes: string;
  includedItems: string;
  priceNote: string;
  status: WorkshopPlanStatus;
  sortOrder: number;
  pricingMode: 'standard' | 'maintenance';
  participantPrice?: number;
  nonParticipantPrice?: number;
}

const moss2 = 'ヒノキゴケ\nタマゴケ';
const moss3 = `${moss2}\nコツボゴケ`;
const moss5 = `${moss3}\nムチゴケ\nカサゴケ または コウヤノマンネングサ`;
const moss6 = `${moss3}\nムチゴケ\nカサゴケ\nコウヤノマンネングサ`;

function course(
  id: string,
  containerKey: string,
  containerName: string,
  courseName: string,
  price: number,
  mossTypes: string,
  sortOrder: number,
  options: Partial<Pick<WorkshopCoursePreset, 'description' | 'duration' | 'includedItems' | 'priceNote' | 'category'>> = {}
): WorkshopCoursePreset {
  return {
    _id: `workshop-${id}`,
    title: `${containerName}｜${courseName}`,
    description: options.description || '',
    price,
    duration: options.duration || '',
    category: options.category || 'terrarium',
    containerKey,
    containerKeys: [containerKey],
    containerName,
    courseName,
    mossTypes,
    includedItems: options.includedItems || '',
    priceNote: options.priceNote || 'フィギュア別売り',
    status: 'hidden',
    sortOrder,
    pricingMode: 'standard',
  };
}

const extraMaterials = 'フィギュア別売り。追加資材が必要な場合は別途料金が加算されます。';
const figureAndPlants = 'フィギュア・植物別売り。追加資材が必要な場合は別途料金が加算されます。';

const terrariumCourses: WorkshopCoursePreset[] = [
  course('ss-free', 'glass-canister-ss', 'ガラスキャニスターSS', '初心者自由制作（苔2種）', 3000, moss2, 10, {
    description: '苔・テラリウムの説明付き。自由に景色を制作するコースです。', duration: '約90分', priceNote: extraMaterials,
  }),
  course('ss-first', 'glass-canister-ss', 'ガラスキャニスターSS', '初めてコース（苔2種・見本あり）', 2500, moss2, 20, {
    description: '苔・テラリウムの説明付き。見本を参考に制作する初めての方向けコースです。', duration: '約90分',
  }),
  course('s-free', 'glass-ball-s', 'ガラスボールS', '初心者自由制作（苔3種）', 4500, moss3, 110, {
    description: '苔・テラリウムの説明付き。自由に景色を制作するコースです。', duration: '約120分', priceNote: extraMaterials,
  }),
  course('s-first', 'glass-ball-s', 'ガラスボールS', '初めてコース（苔3種・見本あり）', 4000, moss3, 120, {
    description: '苔・テラリウムの説明付き。見本を参考に制作する初めての方向けコースです。', duration: '約120分',
  }),
  course('s-stream', 'glass-ball-s', 'ガラスボールS', '渓流のテラリウム', 4500, moss3, 130, { duration: '約120分' }),
  course('s-sea', 'glass-ball-s', 'ガラスボールS', '海のテラリウム', 4500, moss3, 140, { duration: '約120分' }),
  course('s-farm', 'glass-ball-s', 'ガラスボールS', '牧場のテラリウム', 5500, moss3, 150, {
    duration: '約120分', includedItems: '牛フィギュア×2\n柵×1', priceNote: '記載の付属品以外のフィギュアは別売りです。',
  }),
  course('s-home', 'glass-ball-s', 'ガラスボールS', 'マイホームテラリウム（家と庭）', 5500, moss3, 160, {
    duration: '約120分', includedItems: '家×1\n階段×1', priceNote: '記載の付属品以外のフィギュアは別売りです。',
  }),
  course('s-snow', 'glass-ball-s', 'ガラスボールS', '雪景色のテラリウム', 4500, moss3, 170, { duration: '約120分' }),
  course('pop-free', 'pop-jar', 'ポップジャー', '初心者自由制作（苔3種）', 5500, moss3, 210, {
    description: '苔・テラリウムの説明付き。自由に景色を制作するコースです。', duration: '約120分', priceNote: extraMaterials,
  }),
  course('pop-first', 'pop-jar', 'ポップジャー', '初めてコース（苔3種・見本あり）', 5000, moss3, 220, {
    description: '苔・テラリウムの説明付き。見本を参考に制作する初めての方向けコースです。', duration: '約120分',
  }),
  course('pop-cliff', 'pop-jar', 'ポップジャー', '懸崖のテラリウム', 6000, moss3, 230, {
    duration: '約120分', priceNote: extraMaterials,
  }),
  course('pop-stairs', 'pop-jar', 'ポップジャー', '階段のテラリウム', 6000, moss3, 240, {
    duration: '約120分', includedItems: '階段×2', priceNote: '記載の付属品以外のフィギュアは別売りです。',
  }),
  course('m-free', 'glass-ball-m', 'ガラスボールM', '自由制作（苔5種）', 8500, moss5, 310, {
    description: '制作方法のみご説明し、自由に景色を制作するコースです。', duration: '約120〜180分', priceNote: figureAndPlants,
  }),
  course('m-stone-steps', 'glass-ball-m', 'ガラスボールM', '石段のテラリウム', 9000, moss5, 320, {
    duration: '約120〜180分', priceNote: 'フィギュア・植物別売り',
  }),
  course('l-free', 'glass-ball-l', 'ガラスボールL', '自由制作（苔6種）', 18000, moss6, 410, { priceNote: figureAndPlants }),
  course('box-free', 'glass-box', 'ガラスボックス', '初心者自由制作（苔6種）', 18000, moss6, 510, { priceNote: figureAndPlants }),
];

function maintenance(
  id: string,
  containerKey: string,
  containerName: string,
  participantPrice: number,
  nonParticipantPrice: number,
  mossTypes: string,
  sortOrder: number,
  options: { consultation?: boolean; containerKeys?: string[] } = {}
): WorkshopCoursePreset {
  const preset = course(
    `maintenance-${id}`,
    containerKey,
    containerName,
    'メンテナンス会',
    nonParticipantPrice,
    mossTypes,
    sortOrder,
    {
      category: 'maintenance',
      description: `予約制${options.consultation ? '・要相談' : ''}。苔テラリウムのメンテナンスを行います。`,
      duration: options.consultation ? '要相談' : '',
      priceNote: '苔以外の植物は別売りです。',
    }
  );
  return {
    ...preset,
    containerKeys: options.containerKeys || [containerKey],
    pricingMode: 'maintenance',
    participantPrice,
    nonParticipantPrice,
  };
}

const maintenanceCourses: WorkshopCoursePreset[] = [
  maintenance('ss', 'glass-canister-ss', 'ガラスキャニスターSS', 1800, 2100, moss2, 1010),
  maintenance('s', 'glass-ball-s', 'ガラスボールS', 2900, 3400, moss3, 1110),
  maintenance('pop', 'pop-jar', 'ポップジャー', 3600, 4200, moss3, 1210),
  maintenance('m', 'glass-ball-m', 'ガラスボールM', 6200, 7100, moss5, 1310, { consultation: true }),
  maintenance(
    'l-or-box',
    'glass-ball-l-or-box',
    'ガラスボールL または ガラスボックス',
    10000,
    12000,
    moss6,
    1410,
    { consultation: true, containerKeys: ['glass-ball-l', 'glass-box'] }
  ),
];

export const workshopCoursePresets: WorkshopCoursePreset[] = [
  ...terrariumCourses,
  ...maintenanceCourses,
];

export const workshopContainerOrder = [
  'glass-canister-ss',
  'glass-ball-s',
  'pop-jar',
  'glass-ball-m',
  'glass-ball-l',
  'glass-box',
];
