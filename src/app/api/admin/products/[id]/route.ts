import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
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
        isVisible,
        "salesItemId": salesItem._ref,
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

    // 在庫変更は履歴を必ず残すため、在庫管理APIだけに集約する
    if ('stockQuantity' in body || 'reserved' in body || 'inStock' in body) {
      return NextResponse.json(
        { error: '在庫数は在庫管理画面から変更してください' },
        { status: 400 }
      );
    }

    // 表示/非表示フラグ（明示的にtrue/booleanへ変換して保存。未指定なら変更しない）
    if ('isVisible' in body) {
      body.isVisible = body.isVisible !== false;
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

    // salesItem は body.salesItemId（文字列、または未選択時は空文字/null）で来る想定。
    // ...body 経由で生の salesItem/salesItemId が二重に入らないよう除外し、明示的に反映する
    const { salesItemId, salesItem: _rawSalesItem, ...restBody } = body;
    let patch = writeClient.patch(id).set({
      ...restBody,
      _updatedAt: new Date().toISOString(),
    });
    if ('salesItemId' in body) {
      if (salesItemId) {
        patch = patch.set({ salesItem: { _type: 'reference', _ref: salesItemId } });
      } else {
        patch = patch.unset(['salesItem']);
      }
    }
    const product = await patch.commit();

    // 公開側（/shop 一覧・/shop/[slug] 詳細）のキャッシュを即時破棄し、
    // 表示/非表示やスラッグ変更などをほぼ即座に反映させる
    revalidateTag('products');

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

    // 削除も公開側キャッシュへ即時反映する
    revalidateTag('products');

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
