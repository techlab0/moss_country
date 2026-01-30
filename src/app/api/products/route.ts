import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

// ストアフロント用 商品一覧（useCdn: false で登録直後の商品も即時反映）
export async function GET() {
  try {
    const products = await writeClient.fetch(
      `*[_type == "product"] | order(sortOrder asc) {
        _id,
        name,
        slug,
        price,
        category,
        images[] {
          _type,
          _key,
          asset-> {
            _ref,
            url
          },
          alt
        },
        featured,
        inStock,
        "dimensions": size
      }`,
      {},
      { next: { revalidate: 60 } }
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
