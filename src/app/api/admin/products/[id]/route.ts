import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { generateProductSlug, resolveUniqueSlug } from '@/lib/slugUtils';

// 特定商品取得（useCdn: false で確実に取得。画像は url 付きで返す＝編集画面サムネイル用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const product = await writeClient.fetch(
      `*[_id == $id][0] {
        _id,
        _type,
        name,
        nameReading,
        slug,
        description,
        price,
        category,
        images[] {
          _type,
          _key,
          asset,
          "url": asset->url
        },
        size,
        dimensions,
        materials,
        careInstructions,
        stockQuantity,
        reserved,
        lowStockThreshold,
        featured,
        weight,
        fragile,
        inStock,
        _createdAt,
        _updatedAt
      }`,
      { id }
    );

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('商品取得エラー:', error);
    return NextResponse.json(
      { error: '商品の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 商品更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 在庫数に基づいてinStockを自動更新
    if (typeof body.stockQuantity === 'number') {
      body.inStock = body.stockQuantity > 0;
    }

    // slugが送られてきた場合、空・「-」など無効な値なら安全網としてフォールバック生成し、
    // 他商品と衝突しないことを確認してから保存する
    if ('slug' in body) {
      let slugCurrent =
        typeof body.slug === 'string' ? body.slug : body.slug?.current || '';
      slugCurrent = slugCurrent.trim();
      if (!slugCurrent || slugCurrent === '-') {
        slugCurrent = generateProductSlug(String(body.name || ''));
      }

      const isSlugTaken = async (candidate: string) => {
        const existingId = await writeClient.fetch(
          `*[_type == "product" && slug.current == $slug && _id != $id][0]._id`,
          { slug: candidate, id }
        );
        return Boolean(existingId);
      };
      slugCurrent = await resolveUniqueSlug(slugCurrent, isSlugTaken);

      body.slug = { _type: 'slug' as const, current: slugCurrent };
    }

    const product = await writeClient
      .patch(id)
      .set({
        ...body,
        _updatedAt: new Date().toISOString()
      })
      .commit();

    return NextResponse.json(product);
  } catch (error) {
    console.error('商品更新エラー:', error);
    return NextResponse.json(
      { error: '商品の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 商品削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    await client.delete(id);
    
    return NextResponse.json(
      { message: '商品を削除しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('商品削除エラー:', error);
    return NextResponse.json(
      { error: '商品の削除に失敗しました' },
      { status: 500 }
    );
  }
}