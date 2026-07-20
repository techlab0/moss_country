import { NextRequest, NextResponse } from 'next/server';
import { getProductsWithInventory } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getOrders } from '@/lib/orders';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 商品データを取得して統計を計算
    const products = await getProductsWithInventory();
    
    // 商品数
    const totalProducts = products.length;
    
    // 低在庫商品数（在庫数がlowStockThreshold以下の商品）
    const lowStockItems = products.filter(product => 
      (product.stockQuantity || 0) <= (product.lowStockThreshold || 5)
    ).length;
    
    // 注文データを取得して集計
    const orders = await getOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + (order.total || 0), 0);
    
    // 在庫切れ商品数
    const outOfStockItems = products.filter(product => 
      (product.stockQuantity || 0) === 0
    ).length;
    
    // 総在庫値（商品価格 × 在庫数の合計）
    const totalInventoryValue = products.reduce((total, product) => {
      return total + (product.price * (product.stockQuantity || 0));
    }, 0);

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalInventoryValue,
      // 前月比データ（現在はダミー値）
      changes: {
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        lowStockItems: 0,
      }
    });
    
  } catch (error) {
    console.error('Dashboard stats fetch error:', error);
    return NextResponse.json(
      { error: 'ダッシュボード統計データの取得に失敗しました' },
      { status: 500 }
    );
  }
}