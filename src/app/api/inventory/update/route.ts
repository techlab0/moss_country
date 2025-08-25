import { NextRequest, NextResponse } from 'next/server';
import { updateProductInventory } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const { productId, stockQuantity, reserved = 0, note } = await request.json();

    if (!productId || typeof stockQuantity !== 'number') {
      return NextResponse.json(
        { error: 'Product ID and stock quantity are required' },
        { status: 400 }
      );
    }

    // Sanityの在庫を更新
    await updateProductInventory(productId, stockQuantity, reserved);

    // TODO: 在庫変更ログをinventoryLogスキーマに保存
    // const logEntry = {
    //   _type: 'inventoryLog',
    //   productId,
    //   type: 'adjustment',
    //   quantity: stockQuantity,
    //   note: note || '手動調整',
    //   timestamp: new Date().toISOString()
    // };

    return NextResponse.json({
      success: true,
      message: 'Inventory updated successfully',
      data: {
        productId,
        stockQuantity,
        reserved,
        availableStock: stockQuantity - reserved
      }
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}