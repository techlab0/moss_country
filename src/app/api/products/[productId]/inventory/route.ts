import { NextRequest, NextResponse } from 'next/server';
import { getSanityInventory } from '@/lib/sanityInventory';

/**
 * 商品在庫取得（サーバー側でSanityを叩くため、ストアフロントから安全に利用可能）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }
    const variant = request.nextUrl.searchParams.get('variant') ?? undefined;
    const inventory = await getSanityInventory(productId, variant);
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('在庫取得エラー:', error);
    return NextResponse.json(
      { error: '在庫の取得に失敗しました' },
      { status: 500 }
    );
  }
}
