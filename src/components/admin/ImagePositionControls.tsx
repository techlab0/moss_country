'use client';

export { imageDisplayScale, imageObjectPosition } from '@/lib/imagePosition';

export interface PositionableSanityImage {
  _type: 'image';
  asset: object;
  hotspot?: { _type?: string; x?: number; y?: number; height?: number; width?: number };
  displayScale?: number;
}

export function ImagePositionControls<T extends PositionableSanityImage>({
  image,
  onChange,
  allowScale = false,
}: {
  image: T;
  onChange: (image: T) => void;
  allowScale?: boolean;
}) {
  const x = Math.round((image.hotspot?.x ?? 0.5) * 100);
  const y = Math.round((image.hotspot?.y ?? 0.5) * 100);
  const scale = Math.min(150, Math.max(50, image.displayScale ?? 100));
  const update = (nextX: number, nextY: number) => onChange({
    ...image,
    hotspot: { _type: 'sanity.imageHotspot', x: nextX / 100, y: nextY / 100, height: 1, width: 1 },
  });
  const updateScale = (displayScale: number) => onChange({ ...image, displayScale });

  return (
    <div className="mt-3 grid gap-3 rounded-md bg-gray-50 p-3 sm:grid-cols-2">
      <label className="text-xs text-gray-700">横位置：{x}%<input className="mt-1 w-full" type="range" min="0" max="100" value={x} onChange={(e) => update(Number(e.target.value), y)} /></label>
      <label className="text-xs text-gray-700">縦位置：{y}%<input className="mt-1 w-full" type="range" min="0" max="100" value={y} onChange={(e) => update(x, Number(e.target.value))} /></label>
      {allowScale && (
        <label className="text-xs text-gray-700 sm:col-span-2">画像サイズ：{scale}%<input className="mt-1 w-full" type="range" min="50" max="150" value={scale} onChange={(e) => updateScale(Number(e.target.value))} /></label>
      )}
      <button type="button" className="text-left text-xs text-gray-500 underline sm:col-span-2" onClick={() => update(50, 50)}>表示位置を中央に戻す</button>
      {allowScale && <button type="button" className="text-left text-xs text-gray-500 underline sm:col-span-2" onClick={() => updateScale(100)}>画像サイズを100%に戻す</button>}
    </div>
  );
}
