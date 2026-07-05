import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { resolveStoreLineItems, StoreLineItemInput } from '@/lib/storeSales';

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

// QR決済の「記録内容」（商品明細の内訳）を修正する。
// 決済済みの金額そのものは変更できない（返金は cancel エンドポイントで行う）。
// 明細合計と決済額がズレた場合はUI側で注意表示する（保存自体は許可）。
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
    const existing = await writeClient.fetch(
      `*[_type == "inStoreCharge" && _id == $id][0]{ _id, status }`,
      { id }
    );
    if (!existing) {
      return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    if (!Array.isArray(body.lineItems)) {
      return NextResponse.json({ error: '商品明細を指定してください' }, { status: 400 });
    }

    const { lineItems } = await resolveStoreLineItems(body.lineItems as StoreLineItemInput[]);

    const charge = await writeClient.patch(id).set({ lineItems }).commit();

    return NextResponse.json({ charge });
  } catch (error) {
    console.error('店頭決済記録更新エラー:', error);
    const message = error instanceof Error ? error.message : '決済記録の更新に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
