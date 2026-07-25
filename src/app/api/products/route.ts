import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

// ストアフロント用 商品一覧（useCdn: false で登録直後の商品も即時反映）
export async function GET() {
  try {
    const products = await writeClient.fetch(
      `*[_type == "product" && isVisible != false] | order(sortOrder asc) {
        _id,
        name,
        nameReading,
        slug,
        price,
        category,
        description,
        stockQuantity,
        reserved,
        images[] {
          _type,
          _key,
          asset-> {
            _id,
            url,
            metadata {
              dimensions {
                width,
                height
              }
            }
          },
          alt,
          hotspot,
          crop
        },
        featured,
        inStock,
        "dimensions": size,
        "salesItemId": salesItem._ref
      }`,
      {},
      // tags: ['products'] を付け、管理画面の商品更新時に revalidateTag('products') で
      // 即座にこのキャッシュを破棄できるようにする（revalidate:60 は保険のフォールバック）
      { next: { revalidate: 60, tags: ['products'] } }
    );

    return NextResponse.json(products ?? []);
  } catch (error) {
    console.error('商品一覧取得エラー:', error);
    return NextResponse.json(
      { error: '商品の取得に失敗しました' },
      { status: 500 }
    );
  }
}
