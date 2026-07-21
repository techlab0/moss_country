import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getQrPaymentStatus } from '@/lib/paypay';

// PayPay動的QR決済の状況を確定させるための明示ポーリングエンドポイント。
// Squareのwebhook（/api/webhooks/square）に相当する仕組みがPayPayには無いため、
// レジ画面がこのAPIを数秒間隔で叩き、PayPay側の状況をサーバー経由で確認してからchargeを確定する。
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
    const charge: {
      _id: string;
      status: string;
      paypayMerchantPaymentId?: string;
    } | null = await writeClient.fetch(
      `*[_type == "inStoreCharge" && _id == $id][0]{ _id, status, paypayMerchantPaymentId }`,
      { id }
    );

    if (!charge) {
      return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 });
    }

    // 既に確定済みなら再度PayPayへ問い合わせず、そのまま返す（冪等）
    if (charge.status !== 'pending') {
      return NextResponse.json({ status: charge.status });
    }

    if (!charge.paypayMerchantPaymentId) {
      return NextResponse.json({ error: 'PayPay決済情報が記録されていません' }, { status: 400 });
    }

    const result = await getQrPaymentStatus(charge.paypayMerchantPaymentId);

    if (result.status === 'COMPLETED') {
      await writeClient
        .patch(id)
        .set({ status: 'paid', paidAt: new Date().toISOString() })
        .commit();
      return NextResponse.json({ status: 'paid' });
    }

    if (result.status === 'FAILED' || result.status === 'CANCELED' || result.status === 'EXPIRED') {
      return NextResponse.json({ status: 'failed' });
    }

    // CREATED / AUTHORIZED は引き続き支払い待ち
    return NextResponse.json({ status: 'pending' });
  } catch (error) {
    console.error('PayPay決済状況取得エラー:', error);
    const message = error instanceof Error ? error.message : 'PayPay決済状況の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
