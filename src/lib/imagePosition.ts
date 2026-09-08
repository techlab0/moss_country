export interface ImageWithHotspot {
  _type?: string;
  asset?: object;
  hotspot?: { x?: number; y?: number };
}

/** Sanity画像のhotspotをCSSのobject-positionへ変換する。 */
export function imageObjectPosition(image?: ImageWithHotspot): string {
  const x = Math.min(1, Math.max(0, image?.hotspot?.x ?? 0.5));
  const y = Math.min(1, Math.max(0, image?.hotspot?.y ?? 0.5));
  return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
}
