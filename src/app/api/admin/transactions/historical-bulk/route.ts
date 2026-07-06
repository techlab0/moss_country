import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { DATE_PATTERN } from '@/lib/salesAggregation';
import { resolveStoreLineItems, distributeDiscount, StoreLineItemInput, DiscountType } from '@/lib/storeSales';

const PAYMENT_METHODS = ['cash', 'payPay', 'card'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];
const DISCOUNT_TYPES = ['amount', 'percent'] as const;

// 過去の手書き記録をまとめて登録する。1回の割引入力を、支払い方法ごとの小計比率で
// サーバー側で按分するため（クライアントの計算を信用しない）、通常の取引登録とは別エンドポイントにしている。
// 来店者数・購入組数は集計タブの手動欄で別途管理するため、カウンタ加算は行わない。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const date = body.date;
    if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: '日付を指定してください' }, { status: 400 });
    }

    const discountType = DISCOUNT_TYPES.includes(body.discountType) ? (body.discountType as DiscountType) : undefined;
    const discountValue = Number(body.discountValue) || 0;
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined;

    const groupsInput: Partial<Record<PaymentMethod, StoreLineItemInput[]>> = body.groups || {};

    const resolved: Array<{ method: PaymentMethod; lineItems: Awaited<ReturnType<typeof resolveStoreLineItems>>['lineItems']; subtotal: number }> = [];
    for (const method of PAYMENT_METHODS) {
      const input = Array.isArray(groupsInput[method]) ? groupsInput[method]! : [];
      if (input.length === 0) continue;
      const { lineItems, total: subtotal } = await resolveStoreLineItems(input);
      if (lineItems.length === 0) continue;
      resolved.push({ method, lineItems, subtotal });
    }

    if (resolved.length === 0) {
      return NextResponse.json({ error: '商品を1つ以上入力してください' }, { status: 400 });
    }

    const discountAmounts = distributeDiscount(resolved.map(r => r.subtotal), discountType, discountValue);

    const transactions = [];
    for (let i = 0; i < resolved.length; i++) {
      const { method, lineItems, subtotal } = resolved[i];
      const discountAmount = discountAmounts[i];
      const transaction = await writeClient.create({
        _type: 'storeTransaction',
        date,
        createdAt: new Date().toISOString(),
        paymentMethod: method,
        visitorCount: 0,
        lineItems,
        subtotal,
        discountType,
        discountValue: discountType ? discountValue : undefined,
        discountAmount,
        total: subtotal - discountAmount,
        notes,
        source: 'historical',
      });
      transactions.push(transaction);
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('過去実績の一括登録エラー:', error);
    const message = error instanceof Error ? error.message : '登録に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
