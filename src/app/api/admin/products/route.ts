import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { generateProductSlug, resolveUniqueSlug } from '@/lib/slugUtils';

// 商品一覧取得（useCdn: false で登録直後の商品も即時反映）
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

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
        fragile,
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
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // スラッグは常に Sanity の slug 型 { current: string } で送る
    let slugCurrent =
      typeof body.slug === 'string' ? body.slug : body.slug?.current || '';
    slugCurrent = slugCurrent.trim();
    if (!slugCurrent || slugCurrent === '-') {
      slugCurrent = generateProductSlug(String(body.name || ''));
    }

    const isSlugTaken = async (candidate: string) => {
      const existingId = await writeClient.fetch(
        `*[_type == "product" && slug.current == $slug][0]._id`,
        { slug: candidate }
      );
      return Boolean(existingId);
    };
    slugCurrent = await resolveUniqueSlug(slugCurrent, isSlugTaken);

    const slug = { _type: 'slug' as const, current: slugCurrent };

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
      slug,
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