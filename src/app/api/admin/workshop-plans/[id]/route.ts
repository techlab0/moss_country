import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { normalizePlanInput } from '../route';

// ワークショップの予約プラン（simpleWorkshop）の更新・削除。

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
    const normalized = normalizePlanInput(await request.json());
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const plan = await writeClient.patch(id).set(normalized).commit();

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('ワークショッププラン更新エラー:', error);
    return NextResponse.json({ error: 'プランの更新に失敗しました' }, { status: 500 });
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

    const exists: number = await writeClient.fetch(
      `count(*[_type == "simpleWorkshop" && _id == $id])`,
      { id }
    );
    if (exists === 0) {
      return NextResponse.json({ error: 'プランが見つかりません' }, { status: 404 });
    }

    // 既存の予約はプラン名と金額をスナップショットで保持しているため、削除しても
    // 過去・未開催の予約の表示や金額は壊れない。削除で止まるのは「今後の新規予約」だけ。
    // 未開催の予約が残っているかは一覧APIが件数を返すので、UI側で警告してから呼ぶ。
    await writeClient.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ワークショッププラン削除エラー:', error);
    return NextResponse.json({ error: 'プランの削除に失敗しました' }, { status: 500 });
  }
}
