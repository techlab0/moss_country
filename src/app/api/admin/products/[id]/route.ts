import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

// 特定商品取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await client.getDocument(params.id);
    
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // 在庫数に基づいてinStockを自動更新
    if (typeof body.stockQuantity === 'number') {
      body.inStock = body.stockQuantity > 0;
    }

    const product = await client
      .patch(params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    await client.delete(params.id);
    
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