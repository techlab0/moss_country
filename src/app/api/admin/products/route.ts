import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

// 商品一覧取得（useCdn: false で登録直後の商品も即時反映）
export async function GET(request: NextRequest) {
  try {
    const products = await writeClient.fetch(`
      *[_type == "product"] | order(sortOrder asc, _createdAt desc) {
        _id,
        name,
        slug,
        price,
        category,
        description,
        images,
        features,
        "dimensions": size,
        stockQuantity,
        reserved,
        lowStockThreshold,
        inStock,
        featured,
        materials,
        careInstructions,
        weight,
        sortOrder,
        _createdAt,
        _updatedAt
      }
    `);

    return NextResponse.json(products);
  } catch (error) {
    console.error('商品取得エラー:', error);
    return NextResponse.json(
      { error: '商品の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 新商品作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // スラッグは常に Sanity の slug 型 { current: string } で送る
    const slugCurrent =
      typeof body.slug === 'string'
        ? body.slug
        : body.slug?.current ||
          (body.name
            ? String(body.name)
                .toLowerCase()
                .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
            : '');
    const slug = slugCurrent ? { _type: 'slug' as const, current: slugCurrent } : undefined;

    // フォームの dimensions → スキーマの size
    const size =
      body.dimensions && Object.keys(body.dimensions).length > 0
        ? {
            width: body.dimensions.width,
            height: body.dimensions.height,
            depth: body.dimensions.depth,
          }
        : undefined;

    const { dimensions, slug: _s, ...rest } = body;
    const doc: Record<string, unknown> = {
      _type: 'product',
      ...rest,
      ...(slug && { slug }),
      ...(size && { size }),
      inStock: (body.stockQuantity ?? 0) > 0,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    };

    const product = await writeClient.create(doc);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('商品作成エラー:', error);
    return NextResponse.json(
      { error: '商品の作成に失敗しました' },
      { status: 500 }
    );
  }
}