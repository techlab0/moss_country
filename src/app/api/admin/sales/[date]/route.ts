import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getJstDayBoundariesUtc, dailySalesDocId, DATE_PATTERN } from '@/lib/salesAggregation';

interface LineItemInput {
  salesItemId: string;
  quantity?: number;
  amount?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { date } = await params;
    if (!DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: '日付の形式が不正です' }, { status: 400 });
    }

    const docId = dailySalesDocId(date);
    const dailySales = await writeClient.fetch(
      `*[_id == $id][0]{
        _id,
        date,
        visitorCount,
        purchaseGroupCount,
        lineItems[]{ "salesItemId": salesItem._ref, quantity, amount },
        cashAmount,
        payPayAmount,
        manualCardAmount,
        wordOfMouthDiscount,
        adjustment,
        notes,
        updatedAt
      }`,
      { id: docId }
    );

    // EC（オンライン）のその日の支払い済み注文を自動集計する
    const { start, end } = getJstDayBoundariesUtc(date);
    const paidOrders: Array<{ total?: number }> = await writeClient.fetch(
      `*[_type == "order" && paymentStatus == "paid" && createdAt >= $start && createdAt < $end]{ total }`,
      { start, end }
    );
    const ecTotal = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    return NextResponse.json({ dailySales: dailySales || null, ecTotal });
  } catch (error) {
    console.error('日別売上取得エラー:', error);
    return NextResponse.json(
      { error: '日別売上の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { date } = await params;
    if (!DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: '日付の形式が不正です' }, { status: 400 });
    }

    const body = await request.json();
    const lineItemsInput: LineItemInput[] = Array.isArray(body.lineItems) ? body.lineItems : [];

    const lineItems = lineItemsInput
      .filter(item => item.salesItemId)
      .map(item => ({
        _type: 'lineItem',
        _key: item.salesItemId,
        salesItem: { _type: 'reference', _ref: item.salesItemId },
        quantity: item.quantity,
        amount: item.amount,
      }));

    const docId = dailySalesDocId(date);
    const doc = {
      _id: docId,
      _type: 'dailySales',
      date,
      visitorCount: body.visitorCount ?? 0,
      purchaseGroupCount: body.purchaseGroupCount ?? 0,
      lineItems,
      cashAmount: body.cashAmount ?? 0,
      payPayAmount: body.payPayAmount ?? 0,
      manualCardAmount: body.manualCardAmount ?? 0,
      wordOfMouthDiscount: body.wordOfMouthDiscount ?? 0,
      adjustment: body.adjustment ?? 0,
      notes: body.notes || '',
      updatedAt: new Date().toISOString(),
    };

    const saved = await writeClient.createOrReplace(doc);

    return NextResponse.json({ dailySales: saved });
  } catch (error) {
    console.error('日別売上保存エラー:', error);
    return NextResponse.json(
      { error: '日別売上の保存に失敗しました' },
      { status: 500 }
    );
  }
}
