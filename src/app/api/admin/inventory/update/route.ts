import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { randomUUID } from 'crypto';
import { verifyAdminSession } from '@/lib/auth';
import { parseInventoryAdjustment } from '@/lib/inventoryAdjustment';
import { writeClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const parsed = parseInventoryAdjustment(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { productId, stockQuantity, note } = parsed.value;

    const product = await writeClient.fetch(
      `*[_type == "product" && _id == $productId][0]{ _id, stockQuantity, reserved }`,
      { productId }
    );
    if (!product) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    const previousStock = Number(product.stockQuantity ?? 0);
    const reserved = Number(product.reserved ?? 0);
    if (stockQuantity < reserved) {
      return NextResponse.json(
        { error: `予約済在庫が${reserved}個あるため、それ未満には変更できません` },
        { status: 400 }
      );
    }
    if (stockQuantity === previousStock) {
      return NextResponse.json({ error: '在庫数が変更されていません' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    await writeClient
      .transaction()
      .patch(productId, (patch) =>
        patch.set({
          stockQuantity,
          inStock: stockQuantity > 0,
          _updatedAt: timestamp,
        })
      )
      .create({
        _id: `inventoryLog.${randomUUID()}`,
        _type: 'inventoryLog',
        productId,
        quantityChange: stockQuantity - previousStock,
        operation: 'adjustment',
        reason: note,
        timestamp,
        user: session.email,
        previousStock,
        newStock: stockQuantity,
      })
      .commit();

    revalidateTag('products');

    return NextResponse.json({
      success: true,
      message: '在庫を更新しました',
      data: {
        productId,
        stockQuantity,
        reserved,
        availableStock: stockQuantity - reserved,
        previousStock,
      },
    });
  } catch (error) {
    console.error('在庫更新エラー:', error);
    return NextResponse.json(
      { error: '在庫更新に失敗しました' },
      { status: 500 }
    );
  }
}
