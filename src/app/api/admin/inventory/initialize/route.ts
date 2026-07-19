import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

// 開発環境でのみ利用可能な在庫初期化API
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    // モック商品IDのリスト
    const mockProductIds = [
      'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6'
    ];

    // 各商品の在庫データを初期化
    const inventoryPromises = mockProductIds.map(async (productId) => {
      try {
        // 既存の在庫データを検索
        const existingInventory = await client.fetch(
          `*[_type == "inventory" && productId == $productId][0]`,
          { productId }
        );

        const inventoryData = {
          _type: 'inventory',
          productId,
          quantity: 20, // 十分な在庫数
          reserved: 0,
          available: 20,
          lowStockThreshold: 5,
          lastUpdated: new Date().toISOString(),
        };

        if (existingInventory) {
          // 既存のデータを更新
          await client
            .patch(existingInventory._id)
            .set(inventoryData)
            .commit();
          
          console.log(`Updated inventory for ${productId}`);
          return { productId, action: 'updated' };
        } else {
          // 新しいデータを作成
          const newInventory = await client.create(inventoryData);
          console.log(`Created inventory for ${productId}`);
          return { productId, action: 'created', id: newInventory._id };
        }
      } catch (error) {
        console.error(`Failed to initialize inventory for ${productId}:`, error);
        return { productId, action: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(inventoryPromises);

    return NextResponse.json({
      success: true,
      message: 'Inventory initialized successfully',
      results,
    });

  } catch (error) {
    console.error('Error initializing inventory:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize inventory',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current inventory status
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    // 全ての在庫データを取得
    const inventoryData = await client.fetch(`
      *[_type == "inventory"] | order(productId) {
        _id,
        productId,
        quantity,
        reserved,
        available,
        lowStockThreshold,
        lastUpdated
      }
    `);

    return NextResponse.json({
      success: true,
      inventory: inventoryData,
      count: inventoryData.length,
    });

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch inventory',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}