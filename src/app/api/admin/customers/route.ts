import { NextRequest, NextResponse } from 'next/server';

// モック顧客データ
export async function GET(request: NextRequest) {
  try {
    // 実際はデータベースから取得することになります
    const customers = [
      {
        id: 'cust_001',
        name: '田中 太郎',
        email: 'tanaka@example.com',
        phone: '090-1234-5678',
        address: '北海道札幌市中央区',
        totalOrders: 3,
        totalSpent: 15800,
        lastOrderDate: '2024-01-15',
        createdAt: '2023-12-01'
      },
      {
        id: 'cust_002', 
        name: '佐藤 花子',
        email: 'sato@example.com',
        phone: '080-9876-5432',
        address: '北海道札幌市北区',
        totalOrders: 1,
        totalSpent: 4500,
        lastOrderDate: '2024-01-10',
        createdAt: '2024-01-08'
      },
      {
        id: 'cust_003',
        name: '鈴木 一郎',
        email: 'suzuki@example.com',
        phone: '070-5555-1111',
        totalOrders: 5,
        totalSpent: 28900,
        lastOrderDate: '2024-01-18',
        createdAt: '2023-11-15'
      },
      {
        id: 'cust_004',
        name: '高橋 美奈',
        email: 'takahashi@example.com',
        totalOrders: 2,
        totalSpent: 8600,
        lastOrderDate: '2024-01-12',
        createdAt: '2023-12-20'
      }
    ];

    return NextResponse.json({
      success: true,
      customers
    });

  } catch (error) {
    console.error('Customer fetch error:', error);
    return NextResponse.json(
      { error: '顧客データの取得に失敗しました' },
      { status: 500 }
    );
  }
}