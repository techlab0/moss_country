import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { writeClient } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const [products, logs] = await Promise.all([
      writeClient.fetch(`
        *[_type == "product"] | order(sortOrder asc, _createdAt desc) {
          _id,
          name,
          category,
          price,
          stockQuantity,
          reserved,
          lowStockThreshold
        }
      `),
      writeClient.fetch(`
        *[_type == "inventoryLog"] | order(timestamp desc) [0...50] {
          _id,
          productId,
          quantityChange,
          operation,
          reason,
          timestamp,
          user,
          previousStock,
          newStock
        }
      `),
    ]);

    return NextResponse.json({ products: products || [], logs: logs || [] });
  } catch (error) {
    console.error('在庫管理データ取得エラー:', error);
    return NextResponse.json({ error: '在庫管理データの取得に失敗しました' }, { status: 500 });
  }
}
