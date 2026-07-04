import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const patchFields: Record<string, unknown> = {};
    if (typeof body.category === 'string') patchFields.category = body.category;
    if (typeof body.name === 'string') patchFields.name = body.name;
    if (typeof body.pricingType === 'string') patchFields.pricingType = body.pricingType;
    if (typeof body.unitPrice === 'number') patchFields.unitPrice = body.unitPrice;
    if (typeof body.sortOrder === 'number') patchFields.sortOrder = body.sortOrder;
    if (typeof body.isActive === 'boolean') patchFields.isActive = body.isActive;

    const updated = await writeClient.patch(id).set(patchFields).commit();

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('売上項目更新エラー:', error);
    return NextResponse.json(
      { error: '売上項目の更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    await writeClient.delete(id);

    return NextResponse.json({ message: '売上項目を削除しました' });
  } catch (error) {
    console.error('売上項目削除エラー:', error);
    return NextResponse.json(
      { error: '売上項目の削除に失敗しました' },
      { status: 500 }
    );
  }
}
