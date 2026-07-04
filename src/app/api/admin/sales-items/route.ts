import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const items = await writeClient.fetch(`
      *[_type == "salesItem"] | order(category asc, sortOrder asc) {
        _id,
        category,
        name,
        pricingType,
        unitPrice,
        sortOrder,
        isActive
      }
    `);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('売上項目取得エラー:', error);
    return NextResponse.json(
      { error: '売上項目の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { category, name, pricingType, unitPrice, sortOrder } = body;

    if (!category || !name || !pricingType) {
      return NextResponse.json(
        { error: 'カテゴリー・項目名・入力方法は必須です' },
        { status: 400 }
      );
    }

    const doc = await writeClient.create({
      _type: 'salesItem',
      category,
      name,
      pricingType,
      unitPrice: pricingType === 'fixed' ? (unitPrice ?? 0) : undefined,
      sortOrder: sortOrder ?? 0,
      isActive: true,
    });

    return NextResponse.json({ item: doc }, { status: 201 });
  } catch (error) {
    console.error('売上項目作成エラー:', error);
    return NextResponse.json(
      { error: '売上項目の作成に失敗しました' },
      { status: 500 }
    );
  }
}
