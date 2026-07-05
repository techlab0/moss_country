import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { refundPayment, deletePaymentLink } from '@/lib/square';
import { adjustDailyCounters, jstDateOf } from '@/lib/storeSales';

// 店頭QR決済のキャンセル。
// - 未払い(pending): Square側の決済リンクを削除（ベストエフォート）して cancelled にし、購入組数を戻す
// - 支払い済み(paid): Squareの返金APIで全額返金し refunded にする（お客様のカードに実際に返金される）
export async function POST(
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
      amount: number;
      squarePaymentId?: string;
      paymentLinkId?: string;
      createdAt?: string;
    } | null = await writeClient.fetch(
      `*[_type == "inStoreCharge" && _id == $id][0]{ _id, status, amount, squarePaymentId, paymentLinkId, createdAt }`,
      { id }
    );
    if (!charge) {
      return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 });
    }

    if (charge.status === 'pending') {
      // Square側のリンク削除は失敗しても続行する（リンクが残ってもお客様が支払わなければ実害はない）
      if (charge.paymentLinkId) {
        try {
          await deletePaymentLink(charge.paymentLinkId);
        } catch (err) {
          console.error('決済リンク削除に失敗しました（キャンセル処理は続行します）:', err);
        }
      }

      const updated = await writeClient.patch(id).set({ status: 'cancelled' }).commit();
      // 発行時に加算した購入組数を戻す（来店の事実は残すため来店者数はそのまま）
      if (charge.createdAt) {
        await adjustDailyCounters(jstDateOf(charge.createdAt), 0, -1);
      }
      return NextResponse.json({ charge: updated });
    }

    if (charge.status === 'paid') {
      if (!charge.squarePaymentId) {
        return NextResponse.json(
          { error: '決済IDが記録されていないため返金できません。Squareダッシュボードから返金してください' },
          { status: 400 }
        );
      }

      const refund = await refundPayment(charge.squarePaymentId, charge.amount, uuidv4());
      const updated = await writeClient
        .patch(id)
        .set({ status: 'refunded', refundId: refund.id })
        .commit();
      return NextResponse.json({ charge: updated });
    }

    return NextResponse.json(
      { error: `この決済はキャンセルできません（現在のステータス: ${charge.status}）` },
      { status: 400 }
    );
  } catch (error) {
    console.error('店頭決済キャンセルエラー:', error);
    const message = error instanceof Error ? error.message : 'キャンセル処理に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
