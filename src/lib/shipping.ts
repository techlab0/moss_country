// 送料計算の共通ロジック。クライアント（checkout表示）とサーバー（決済確定・改ざん防止）の
// 両方から同じ関数を使うことで、表示送料と請求送料を必ず一致させる。
//
// 純粋関数（calculatePackageMetrics / determineSizeTier / resolveShippingFee）は外部依存を持たない。
// Sanityから設定を読む getShippingSettings のみ writeClient を動的インポートし、
// checkout など クライアントバンドルに Sanity クライアントが混入しないようにしている。

// ===== 型定義 =====

export type CarrierId = 'yupack' | 'yamato';

// クライアント（フォーム送信値等）から来た値が正当な CarrierId かどうかを検証する。
// 送料表を持たない不正な業者IDが計算・保存に混入するのを防ぐために各所で使う。
export function isCarrierId(value: unknown): value is CarrierId {
  return value === 'yupack' || value === 'yamato';
}

export interface ShippingZone {
  id: string;
  name: string;
  prefectures: string[];
}

export interface ShippingSizeTier {
  size: number; // サイズ区分（例: 60, 80, ...）＝ゆうパック/ヤマトの「◯◯サイズ」
  maxDimensionSum: number; // このサイズに収まる3辺合計の上限（cm）
  maxWeight: number; // このサイズに収まる総重量の上限（g）
}

export interface ShippingRate {
  zoneId: string;
  size: number;
  price: number; // 送料（円・税込）
}

export interface CarrierTable {
  label: string;
  sizeTiers: ShippingSizeTier[];
  rates: ShippingRate[];
}

export interface ShippingSettings {
  carrier: CarrierId; // 実際に利用する配送業者
  zones: ShippingZone[];
  carriers: Record<CarrierId, CarrierTable>;
  freeShippingMode: boolean; // サイト全体を送料無料にする（全商品を送料込み価格で販売する運用）
  freeShippingThreshold: number; // この小計以上で割引を適用（円）
  shippingDiscount: number; // 割引額（円）
  expressSurcharge: number; // 速達加算（円）
  fragileSurcharge: number; // 割れ物加算（円）
  packagingBufferCm: number; // 緩衝材ぶんの各辺の余裕（cm）
  packagingWeightG: number; // 梱包材の重量（g）
}

// 送料計算に必要な商品情報の最小形（Cart/Order どちらの item からも組み立てられる）
export interface ShippingItem {
  dimensions?: { width?: number | null; height?: number | null; depth?: number | null } | null;
  weight?: number | null; // g
  fragile?: boolean | null; // 割れ物なら送料に割れ物加算を適用
  quantity: number;
}

export interface PackageMetrics {
  dimensionSum: number; // 梱包後の3辺合計（cm）
  totalWeight: number; // 梱包材込みの総重量（g）
}

export interface ShippingOptions {
  express?: boolean;
  hasFragile?: boolean;
  // 顧客が選択した配送業者。未指定時は settings.carrier（管理者設定のデフォルト業者）を使う。
  carrier?: CarrierId;
}

export interface ShippingResult {
  ok: boolean;
  fee: number; // 割引適用後の最終送料
  baseFee: number; // 料金表上の基本送料
  surcharge: number; // 加算合計（速達＋割れ物）
  discount: number; // 割引額
  size: number | null; // 判定されたサイズ区分
  zoneId: string | null;
  dimensionSum: number;
  totalWeight: number;
  error?: string;
}

// 寸法・重量が未入力の商品に使うフォールバック値
export const DEFAULT_ITEM_WEIGHT_G = 500;
// どの寸法も未入力のときに1個あたり最小とみなす3辺合計（cm）
const FALLBACK_ITEM_DIMENSION_SUM = 30;

// ===== 純粋計算関数 =====

/**
 * カート内の商品から、梱包後の3辺合計(cm)と総重量(g)を近似的に算出する。
 * 厳密な3Dパッキングは行わず、実用的な近似として
 *  - 3辺合計 = max(単品の3辺合計の最大値, 総体積の立方根近似) + 緩衝材ぶん
 *  - 総重量 = Σ(商品重量 × 個数) + 梱包材重量
 * を用いる。これにより「大きい商品1個」でも「小さい商品多数」でも妥当なサイズになる。
 */
export function calculatePackageMetrics(items: ShippingItem[], settings: ShippingSettings): PackageMetrics {
  let totalWeight = settings.packagingWeightG;
  let volume = 0;
  let maxSingleSum = 0;

  for (const item of items) {
    const quantity = Math.max(1, Math.floor(item.quantity) || 1);
    const w = Number(item.dimensions?.width) || 0;
    const h = Number(item.dimensions?.height) || 0;
    const d = Number(item.dimensions?.depth) || 0;

    const unitWeight = Number(item.weight) > 0 ? Number(item.weight) : DEFAULT_ITEM_WEIGHT_G;
    totalWeight += unitWeight * quantity;

    if (w > 0 && h > 0 && d > 0) {
      volume += w * h * d * quantity;
      const singleSum = w + h + d;
      if (singleSum > maxSingleSum) maxSingleSum = singleSum;
    } else {
      // 寸法未入力の商品は最小寸法とみなして体積に加算する
      const fallbackSide = FALLBACK_ITEM_DIMENSION_SUM / 3;
      volume += fallbackSide * fallbackSide * fallbackSide * quantity;
      if (FALLBACK_ITEM_DIMENSION_SUM > maxSingleSum) maxSingleSum = FALLBACK_ITEM_DIMENSION_SUM;
    }
  }

  const cubeSide = volume > 0 ? Math.cbrt(volume) : 0;
  const cubeSum = cubeSide * 3;
  const bufferSum = settings.packagingBufferCm * 3; // 各辺に余裕を足す＝3辺合計に3倍
  const dimensionSum = Math.ceil(Math.max(maxSingleSum, cubeSum) + bufferSum);

  return { dimensionSum, totalWeight: Math.ceil(totalWeight) };
}

/**
 * 梱包サイズ・重量から、収まる最小のサイズ区分を求める。どの区分にも収まらなければ null。
 */
export function determineSizeTier(metrics: PackageMetrics, tiers: ShippingSizeTier[]): ShippingSizeTier | null {
  const sorted = [...tiers].sort((a, b) => a.size - b.size);
  for (const tier of sorted) {
    if (metrics.dimensionSum <= tier.maxDimensionSum && metrics.totalWeight <= tier.maxWeight) {
      return tier;
    }
  }
  return null;
}

/**
 * 配送先・商品・小計から送料を確定する。表示にもサーバー確定にもこの関数を使う。
 */
export function resolveShippingFee(
  items: ShippingItem[],
  prefecture: string,
  subtotal: number,
  options: ShippingOptions,
  settings: ShippingSettings
): ShippingResult {
  const metrics = calculatePackageMetrics(items, settings);
  const base: ShippingResult = {
    ok: false,
    fee: 0,
    baseFee: 0,
    surcharge: 0,
    discount: 0,
    size: null,
    zoneId: null,
    dimensionSum: metrics.dimensionSum,
    totalWeight: metrics.totalWeight,
  };

  // サイト全体が送料無料モードなら、地域・サイズに関わらず送料0で確定する
  if (settings.freeShippingMode) {
    return { ...base, ok: true, fee: 0 };
  }

  const table = settings.carriers[options.carrier ?? settings.carrier];
  if (!table) {
    return { ...base, error: '配送業者の料金表が設定されていません' };
  }

  const tier = determineSizeTier(metrics, table.sizeTiers);
  if (!tier) {
    return { ...base, error: '梱包サイズが配送可能な上限を超えています。お手数ですがお問い合わせください。' };
  }

  const zone = settings.zones.find((z) => z.prefectures.includes(prefecture));
  if (!zone) {
    return { ...base, error: '配送先の地域を特定できませんでした' };
  }

  const rate = table.rates.find((r) => r.zoneId === zone.id && r.size === tier.size);
  if (!rate) {
    return { ...base, size: tier.size, zoneId: zone.id, error: 'この地域・サイズの送料が設定されていません' };
  }

  // 割れ物加算は、明示指定（options.hasFragile）またはカート内に割れ物商品があれば適用する
  const hasFragile = options.hasFragile || items.some((item) => item.fragile);
  let surcharge = 0;
  if (options.express) surcharge += settings.expressSurcharge;
  if (hasFragile) surcharge += settings.fragileSurcharge;

  const gross = rate.price + surcharge;
  const discount = subtotal >= settings.freeShippingThreshold ? settings.shippingDiscount : 0;
  const fee = Math.max(0, gross - discount);

  return {
    ok: true,
    fee,
    baseFee: rate.price,
    surcharge,
    discount,
    size: tier.size,
    zoneId: zone.id,
    dimensionSum: metrics.dimensionSum,
    totalWeight: metrics.totalWeight,
  };
}

// ===== デフォルト設定（ドキュメント未作成時のフォールバック兼、初期値） =====

// 料金が同一の都道府県をまとめた地域ゾーン（札幌発・ゆうパック料金表の同額グループに基づく）
export const DEFAULT_ZONES: ShippingZone[] = [
  { id: 'hokkaido', name: '北海道', prefectures: ['北海道'] },
  { id: 'tohoku', name: '東北', prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  {
    id: 'kanto',
    name: '関東・信越',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県'],
  },
  {
    id: 'chubu',
    name: '北陸・中部・東海',
    prefectures: ['富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県'],
  },
  { id: 'kansai', name: '関西', prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  {
    id: 'chugoku_shikoku',
    name: '中国・四国',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'],
  },
  {
    id: 'kyushu',
    name: '九州',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県'],
  },
  { id: 'okinawa', name: '沖縄', prefectures: ['沖縄県'] },
];

// ゾーン順に並べた料金を {size,zone}→ShippingRate[] に展開するヘルパー
const ZONE_ORDER = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kansai', 'chugoku_shikoku', 'kyushu', 'okinawa'];
function buildRates(table: Record<number, number[]>): ShippingRate[] {
  const rates: ShippingRate[] = [];
  for (const [sizeStr, prices] of Object.entries(table)) {
    const size = Number(sizeStr);
    prices.forEach((price, i) => {
      rates.push({ zoneId: ZONE_ORDER[i], size, price });
    });
  }
  return rates;
}

// ゆうパック（札幌発・税込）。現行 checkout のハードコード料金表をそのまま採用した実額。
const YUPACK_TIERS: ShippingSizeTier[] = [
  { size: 60, maxDimensionSum: 60, maxWeight: 2000 },
  { size: 80, maxDimensionSum: 80, maxWeight: 5000 },
  { size: 100, maxDimensionSum: 100, maxWeight: 10000 },
  { size: 120, maxDimensionSum: 120, maxWeight: 15000 },
  { size: 140, maxDimensionSum: 140, maxWeight: 20000 },
  { size: 160, maxDimensionSum: 160, maxWeight: 25000 },
  { size: 170, maxDimensionSum: 170, maxWeight: 25000 },
];

// 各行の並びは ZONE_ORDER（北海道, 東北, 関東信越, 北陸中部東海, 関西, 中国四国, 九州, 沖縄）
const YUPACK_RATES = buildRates({
  60: [810, 1050, 1180, 1300, 1420, 1540, 1660, 1350],
  80: [1030, 1280, 1440, 1590, 1750, 1900, 2060, 1630],
  100: [1280, 1530, 1710, 1880, 2070, 2270, 2460, 1950],
  120: [1530, 1780, 1950, 2140, 2320, 2530, 2740, 2260],
  140: [1780, 2020, 2200, 2390, 2580, 2780, 2970, 2580],
  160: [2020, 2270, 2450, 2640, 2840, 3020, 3220, 2840],
  170: [2270, 2520, 2700, 2890, 3090, 3290, 3470, 3090],
});

// ヤマト運輸 宅急便（札幌発・税込）。サイズ区分と重量上限は正確だが、料金は概算のプレースホルダ。
// 実運用でヤマトを選ぶ場合は、必ず管理画面「送料」タブで最新の実額に更新すること。
const YAMATO_TIERS: ShippingSizeTier[] = [
  { size: 60, maxDimensionSum: 60, maxWeight: 2000 },
  { size: 80, maxDimensionSum: 80, maxWeight: 5000 },
  { size: 100, maxDimensionSum: 100, maxWeight: 10000 },
  { size: 120, maxDimensionSum: 120, maxWeight: 15000 },
  { size: 140, maxDimensionSum: 140, maxWeight: 20000 },
  { size: 160, maxDimensionSum: 160, maxWeight: 25000 },
  { size: 180, maxDimensionSum: 180, maxWeight: 30000 },
  { size: 200, maxDimensionSum: 200, maxWeight: 30000 },
];

// ※概算プレースホルダ。管理画面で実額へ更新する前提。
const YAMATO_RATES = buildRates({
  60: [940, 1310, 1500, 1720, 1930, 2140, 2360, 1610],
  80: [1150, 1530, 1720, 1930, 2140, 2360, 2570, 1830],
  100: [1390, 1770, 1960, 2170, 2380, 2600, 2810, 2070],
  120: [1610, 1990, 2180, 2390, 2600, 2820, 3030, 2290],
  140: [1850, 2230, 2420, 2630, 2840, 3060, 3270, 2530],
  160: [2070, 2450, 2640, 2850, 3060, 3280, 3490, 2750],
  180: [2400, 2780, 2970, 3180, 3390, 3610, 3820, 3080],
  200: [2710, 3090, 3280, 3490, 3700, 3920, 4130, 3390],
});

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  carrier: 'yupack',
  zones: DEFAULT_ZONES,
  carriers: {
    yupack: { label: 'ゆうパック（日本郵便）', sizeTiers: YUPACK_TIERS, rates: YUPACK_RATES },
    yamato: { label: '宅急便（ヤマト運輸）', sizeTiers: YAMATO_TIERS, rates: YAMATO_RATES },
  },
  freeShippingMode: false,
  freeShippingThreshold: 10000,
  shippingDiscount: 500,
  expressSurcharge: 330,
  fragileSurcharge: 200,
  packagingBufferCm: 5,
  packagingWeightG: 200,
};

// ===== 設定取得（サーバー専用） =====

// Sanityのシングルトンドキュメントに保存された設定を、欠損はデフォルトで補完して返す。
// 部分的にしか保存されていなくても安全に動くよう、フィールド単位でマージする。
function mergeWithDefaults(doc: Partial<ShippingSettings> | null | undefined): ShippingSettings {
  if (!doc) return DEFAULT_SHIPPING_SETTINGS;
  const d = DEFAULT_SHIPPING_SETTINGS;
  const carriers = doc.carriers as Partial<Record<CarrierId, CarrierTable>> | undefined;
  return {
    carrier: doc.carrier === 'yamato' || doc.carrier === 'yupack' ? doc.carrier : d.carrier,
    zones: Array.isArray(doc.zones) && doc.zones.length > 0 ? doc.zones : d.zones,
    carriers: {
      yupack: mergeCarrier(carriers?.yupack, d.carriers.yupack),
      yamato: mergeCarrier(carriers?.yamato, d.carriers.yamato),
    },
    freeShippingMode: typeof doc.freeShippingMode === 'boolean' ? doc.freeShippingMode : d.freeShippingMode,
    freeShippingThreshold: numOr(doc.freeShippingThreshold, d.freeShippingThreshold),
    shippingDiscount: numOr(doc.shippingDiscount, d.shippingDiscount),
    expressSurcharge: numOr(doc.expressSurcharge, d.expressSurcharge),
    fragileSurcharge: numOr(doc.fragileSurcharge, d.fragileSurcharge),
    packagingBufferCm: numOr(doc.packagingBufferCm, d.packagingBufferCm),
    packagingWeightG: numOr(doc.packagingWeightG, d.packagingWeightG),
  };
}

function mergeCarrier(saved: CarrierTable | undefined, fallback: CarrierTable): CarrierTable {
  if (!saved) return fallback;
  return {
    label: typeof saved.label === 'string' && saved.label ? saved.label : fallback.label,
    sizeTiers: Array.isArray(saved.sizeTiers) && saved.sizeTiers.length > 0 ? saved.sizeTiers : fallback.sizeTiers,
    rates: Array.isArray(saved.rates) && saved.rates.length > 0 ? saved.rates : fallback.rates,
  };
}

function numOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

let cachedSettings: { value: ShippingSettings; at: number } | null = null;
const SETTINGS_TTL_MS = 30 * 1000;

/**
 * Sanity から送料設定を取得（サーバー専用）。短時間キャッシュしつつ、無ければデフォルトを返す。
 * writeClient を動的インポートすることで、この関数を呼ばないクライアントバンドルに Sanity を含めない。
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  if (cachedSettings && Date.now() - cachedSettings.at < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  try {
    const { writeClient } = await import('./sanity');
    const doc = await writeClient.fetch(`*[_id == "shippingSettings"][0]`);
    const merged = mergeWithDefaults(doc);
    cachedSettings = { value: merged, at: Date.now() };
    return merged;
  } catch (error) {
    console.warn('送料設定の取得に失敗、デフォルト設定を使用:', error);
    return DEFAULT_SHIPPING_SETTINGS;
  }
}

// 管理画面での保存直後など、キャッシュを明示的に無効化したいときに使う
export function invalidateShippingSettingsCache() {
  cachedSettings = null;
}
