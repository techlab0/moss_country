import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

// 商品一覧取得
export async function GET(request: NextRequest) {
  try {
    const products = await client.fetch(`
      *[_type == "product"] | order(_createdAt desc) {
        _id,
        name,
        slug,
        price,
        category,
        description,
        images,
        stockQuantity,
        lowStockThreshold,
        inStock,
        featured,
        materials,
        careInstructions,
        dimensions,
        weight,
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
    const body = await request.json();
    
    // スラッグの自動生成（名前がある場合）
    if (!body.slug && body.name) {
      body.slug = {
        current: body.name
          .toLowerCase()
          .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      };
    }

    const product = await client.create({
      _type: 'product',
      ...body,
      inStock: (body.stockQuantity || 0) > 0,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString()
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('商品作成エラー:', error);
    return NextResponse.json(
      { error: '商品の作成に失敗しました' },
      { status: 500 }
    );
  }
}