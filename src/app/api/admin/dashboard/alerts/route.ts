import { NextRequest, NextResponse } from 'next/server';
import { getProductsWithInventory } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    // 商品データを取得
    const products = await getProductsWithInventory();
    
    // 在庫アラートが必要な商品を抽出
    const alerts = products
      .filter(product => {
        const stock = product.stockQuantity || 0;
        const threshold = product.lowStockThreshold || 5;
        return stock <= threshold;
      })
      .map(product => ({
        id: product._id,
        productName: product.name,
        currentStock: product.stockQuantity || 0,
        minStock: product.lowStockThreshold || 5,
        status: (product.stockQuantity || 0) === 0 ? 'out' : 'low',
        slug: product.slug?.current,
      }))
      .sort((a, b) => {
        // 在庫切れを先に、その後在庫数の少ない順
        if (a.status === 'out' && b.status !== 'out') return -1;
        if (a.status !== 'out' && b.status === 'out') return 1;
        return a.currentStock - b.currentStock;
      });

    return NextResponse.json({ alerts });
    
  } catch (error) {
    console.error('Inventory alerts fetch error:', error);
    return NextResponse.json(
      { error: '在庫アラートデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}