/**
 * TerrariumJourney / TerrariumScene で共有する純粋関数群。
 * すべて決定的（同じ引数には常に同じ結果）で、useFrame 内から毎フレーム呼んでよい。
 */

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** GSAP 風 smoothstep。edge0〜edge1 の範囲外は 0 / 1 にクランプされる。 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 軽いオーバーシュート（行き過ぎてから静止する）イージング。t は 0〜1。 */
export function backOut(t: number, overshoot = 1.4): number {
  const c = clamp(t, 0, 1) - 1;
  return c * c * ((overshoot + 1) * c + overshoot) + 1;
}

export function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return 1 - Math.pow(1 - c, 3);
}

/** シード固定の疑似乱数生成器（mulberry32）。同じ seed からは常に同じ数列。 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 三角関数の重ね合わせによる疑似ノイズ（Perlin/Simplex の代替）。
 * 外部ノイズライブラリを増やさず、滑らかで決定的な凹凸を岩・土マウンドの変位に使う。
 */
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const s = seed * 11.7;
  const n =
    Math.sin(x * 1.7 + y * 0.31 + s * 1.3) +
    Math.sin(y * 2.3 + z * 0.53 + s * 0.7) +
    Math.sin(z * 1.3 + x * 0.47 + s * 1.9) +
    Math.sin((x + y) * 0.9 - s * 0.4) +
    Math.sin((y + z) * 1.1 + s * 2.1) +
    Math.sin((z + x) * 0.6 - s * 1.1);
  return n / 6;
}

export interface MoundPoint {
  position: [number, number, number];
  normal: [number, number, number];
}

export interface MoundConfig {
  centerY: number;
  radiusX: number;
  radiusY: number;
  radiusZ: number;
  /** 0=マウンド頂点付近だけ, 1=裾野まで広く */
  spread?: number;
}

/**
 * 土マウンド（上半分だけの楕円体ドーム）表面上の点と法線をサンプリングする。
 * rocks / soil grains / moss / sprouts の配置に共通で使う。
 */
export function sampleMoundPoint(rng: () => number, mound: MoundConfig, noiseSeed: number): MoundPoint {
  const spread = mound.spread ?? 0.48;
  const u = rng();
  const v = rng();
  const theta = u * Math.PI * 2;
  const phi = Math.pow(v, 0.6) * Math.PI * spread;

  const nx = Math.sin(phi) * Math.cos(theta);
  const ny = Math.cos(phi);
  const nz = Math.sin(phi) * Math.sin(theta);

  const bump = noise3(nx * 2.5, ny * 2.5, nz * 2.5, noiseSeed) * 0.12;
  const rx = mound.radiusX * (1 + bump);
  const ry = mound.radiusY * (1 + bump);
  const rz = mound.radiusZ * (1 + bump);

  const px = nx * rx;
  const py = mound.centerY + ny * ry;
  const pz = nz * rz;

  return {
    position: [px, py, pz],
    normal: [nx, ny, nz],
  };
}

export interface InstanceDatum {
  position: [number, number, number];
  normal: [number, number, number];
  baseScale: number;
  spinY: number;
  colorT: number;
  delay: number;
  duration: number;
  dropOffset: number;
}

/**
 * インスタンス化オブジェクト（土粒・苔クランプ・新芽）用のデータ配列を生成する。
 * seed を固定しているので isMobile が変わっても分布の見た目の傾向は保たれる。
 */
export function generateInstances(
  count: number,
  seed: number,
  mound: MoundConfig,
  opts: {
    scaleMin: number;
    scaleMax: number;
    dropMin?: number;
    dropMax?: number;
    durationMin?: number;
    durationMax?: number;
  }
): InstanceDatum[] {
  const rng = createRng(seed);
  const {
    scaleMin,
    scaleMax,
    dropMin = 0,
    dropMax = 0,
    durationMin = 0.35,
    durationMax = 0.55,
  } = opts;

  const data: InstanceDatum[] = [];
  for (let i = 0; i < count; i++) {
    const { position, normal } = sampleMoundPoint(rng, mound, seed + i * 0.013);
    const duration = lerp(durationMin, durationMax, rng());
    const delay = rng() * (1 - duration);
    data.push({
      position,
      normal,
      baseScale: lerp(scaleMin, scaleMax, rng()),
      spinY: rng() * Math.PI * 2,
      colorT: rng(),
      delay,
      duration,
      dropOffset: lerp(dropMin, dropMax, rng()),
    });
  }
  return data;
}
