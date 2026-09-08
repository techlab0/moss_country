export interface ImageWithHotspot {
  _type?: string;
  asset?: object;
  hotspot?: { x?: number; y?: number };
  displayScale?: number;
}

/** Sanity画像のhotspotをCSSのobject-positionへ変換する。 */
export function imageObjectPosition(image?: ImageWithHotspot): string {
  const x = Math.min(1, Math.max(0, image?.hotspot?.x ?? 0.5));
  const y = Math.min(1, Math.max(0, image?.hotspot?.y ?? 0.5));
  return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
}

/** 未設定の既存画像は100%。異常値は管理画面と同じ50〜150%に収める。 */
export function imageDisplayScale(image?: ImageWithHotspot): number {
  return Math.min(150, Math.max(50, image?.displayScale ?? 100));
}
