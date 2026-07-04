import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

// QRコード表示中の画面から、決済完了（Webhook経由でstatusがpaidに変わる）をポーリングするためのエンドポイント
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const charge = await writeClient.fetch(
      `*[_id == $id][0]{ _id, amount, description, status, createdAt, paidAt, lineItems[]{ name, quantity, amount } }`,
      { id }
    );

    if (!charge) {
      return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ charge });
  } catch (error) {
    console.error('店頭決済状況取得エラー:', error);
    return NextResponse.json(
      { error: '決済状況の取得に失敗しました' },
      { status: 500 }
    );
  }
}
