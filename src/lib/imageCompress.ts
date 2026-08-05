// 管理画面の画像アップロード用のクライアント側圧縮。
//
// スマホで撮った写真は1枚2〜5MBあり、サーバー側の上限（4MB。Vercelのリクエストボディ制限に
// 合わせた値）を超えてアップロードに失敗することが多かった。PCから上げると成功するのは
// 元画像が小さいケースが多いためで、端末の問題ではない。
//
// ここでブラウザ内で長辺を縮小・再エンコードしてから送ることで、失敗をなくしつつ
// Sanity側の保存容量と表示時の転送量も減らす。

/** 長辺の上限（px）。商品詳細の表示に十分な解像度を確保しつつ、ファイルサイズを抑える */
const DEFAULT_MAX_DIMENSION = 2000;
/** これ以下ならそのまま送る（再エンコードで劣化させない） */
const SKIP_COMPRESSION_BYTES = 1.5 * 1024 * 1024;
/** 圧縮後に収めたいサイズ。サーバー側の4MB制限に対して余裕を持たせる */
const TARGET_MAX_BYTES = 3 * 1024 * 1024;

async function loadImage(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  // createImageBitmap はメモリ効率がよく、大きな写真でも扱いやすい
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      cleanup: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('画像を読み込めませんでした'));
    el.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    cleanup: () => URL.revokeObjectURL(url),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * アップロード前に画像を縮小・再圧縮する。
 * 圧縮できない形式や想定外のエラーでは元のファイルをそのまま返し、
 * アップロード自体は従来どおり試みられるようにする（サーバー側で上限チェックが働く）。
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxDimension?: number }
): Promise<File> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;

  // 十分小さいものは触らない（PNGの透過も保持される）
  if (file.size <= SKIP_COMPRESSION_BYTES) {
    return file;
  }

  let source: Awaited<ReturnType<typeof loadImage>> | null = null;
  try {
    source = await loadImage(file);

    const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
    const width = Math.round(source.width * scale);
    const height = Math.round(source.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // JPEGは透過を扱えないため、白で塗ってから描画する（透過部分が黒くなるのを防ぐ）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    source.draw(ctx, width, height);

    // 目標サイズに収まるまで品質を落とす
    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) break;
      if (blob.size <= TARGET_MAX_BYTES || quality === 0.55) {
        // 圧縮しても元より大きくなる場合は元を使う
        if (blob.size >= file.size) return file;
        const baseName = file.name.replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      }
    }

    return file;
  } catch (error) {
    console.warn('画像の圧縮に失敗したため、元のファイルをアップロードします:', error);
    return file;
  } finally {
    source?.cleanup();
  }
}
