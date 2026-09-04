import { NextRequest, NextResponse } from 'next/server';
import { client, urlFor } from '@/lib/sanity';
import type { SanityImage } from '@/types/sanity';

// 公開ページ用: ページ文言・画像の上書き値を返す（認証不要）。
// 保存されている上書きのみ返し、デフォルトとのマージはクライアント側（usePageContent）で行う。
export async function GET(request: NextRequest) {
  try {
    const page = request.nextUrl.searchParams.get('page') || '';
    if (!/^[a-zA-Z-]+$/.test(page)) {
      return NextResponse.json({ error: 'ページIDが不正です' }, { status: 400 });
    }

    const doc: {
      texts?: Array<{ key?: string; value?: string }>;
      images?: Array<{ key?: string; image?: SanityImage; alt?: string; positionX?: number; positionY?: number }>;
    } | null = await client.fetch(
      `*[_type == "pageContent" && _id == $id][0]{ texts[]{ key, value }, images[]{ key, image, alt, positionX, positionY } }`,
      { id: `pageContent-${page}` }
    );

    const texts: Record<string, string> = {};
    for (const t of doc?.texts || []) {
      if (t.key && typeof t.value === 'string') texts[t.key] = t.value;
    }

    const images: Record<string, { src?: string; alt: string; positionX: number; positionY: number }> = {};
    for (const img of doc?.images || []) {
      if (!img.key) continue;
      const base = {
        alt: img.alt || '',
        positionX: typeof img.positionX === 'number' ? img.positionX : 50,
        positionY: typeof img.positionY === 'number' ? img.positionY : 50,
      };
      if (!img.image) {
        images[img.key] = base;
        continue;
      }
      try {
        const src = urlFor(img.image).width(1600).url();
        images[img.key] = { ...base, src };
      } catch {
        // 画像URLの生成に失敗した場合はその画像だけスキップ（デフォルトで表示される）
      }
    }

    return NextResponse.json({ texts, images });
  } catch (error) {
    console.error('ページ文言取得エラー:', error);
    // 取得に失敗してもページ表示は止めない（クライアントはデフォルト文言で表示する）
    return NextResponse.json({ texts: {}, images: {} });
  }
}
