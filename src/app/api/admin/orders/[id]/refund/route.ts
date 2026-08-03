import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyAdminSession } from '@/lib/auth';
import { getOrderById, updateOrderStatus } from '@/lib/orders';
import { restoreOrderInventory } from '@/lib/orderInventory';
import { refundPayment as refundSquarePayment } from '@/lib/square';
import { getPaymentStatus as getPaypayPaymentStatus, refundPayment as refundPaypayPayment } from '@/lib/paypayWebClient';

// EC注文の返金。お客様に実際に全額返金する（カード決済はSquare、PayPay決済はPayPay経由）。
// キャンセル（在庫を戻してステータス変更するだけ）とは異なり、実際に決済が取り消される。

// 在庫を戻し済みのステータス（src/app/api/admin/orders/[id]/route.ts と同じ定義）
const FINAL_STATUSES = ['cancelled', 'refunded'];
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
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    // 二重返金の防止
    if (order.paymentStatus === 'refunded' || order.status === 'refunded' || order.refundId) {
      return NextResponse.json({ error: 'この注文は既に返金済みです' }, { status: 400 });
    }

    // 未決済（銀行振込・代引の入金前など）は返金対象ではない。キャンセルを使う。
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: '支払い済みの注文のみ返金できます。未決済の注文はキャンセルしてください' },
        { status: 400 }
      );
    }

    if (!order.total || order.total <= 0) {
      return NextResponse.json({ error: '返金額が不正です' }, { status: 400 });
    }

    let refundId: string;
    let refundStatus: string | undefined;

    if (order.paymentMethod === 'paypay') {
      // PayPayの決済ID（paymentId）は注文に保存していないため、返金時にPayPayへ問い合わせて取得する。
      // merchantPaymentId には注文番号を使っている（src/app/api/payments/paypay/create/route.ts）。
      const paypayStatus = await getPaypayPaymentStatus(order.orderNumber);
      if (paypayStatus.status !== 'COMPLETED' || !paypayStatus.paymentId) {
        return NextResponse.json(
          { error: `PayPay側の決済が完了状態ではないため返金できません（現在: ${paypayStatus.status}）` },
          { status: 400 }
        );
      }

      // PayPayは返金IDの発行APIを持たないため、こちらで生成したUUIDを返金IDとして扱う
      const refund = await refundPaypayPayment({
        merchantRefundId: uuidv4(),
        paymentId: paypayStatus.paymentId,
        amountJpy: order.total,
      });
      refundId = refund.refundId;
      refundStatus = refund.status;
    } else {
      // カード決済のSquare Payment IDが無いと返金APIを呼べない
      if (!order.squarePaymentId) {
        return NextResponse.json(
          { error: '決済IDが記録されていないため返金できません。Squareダッシュボードから返金してください' },
          { status: 400 }
        );
      }

      // Squareで全額返金（お客様のカードに実際に返金される）
      const refund = await refundSquarePayment(order.squarePaymentId, order.total, uuidv4());
      refundId = refund.id;
      refundStatus = refund.status;
    }

    // 確定済み在庫を戻す。ただしキャンセル済みの注文は
    // ステータス変更時（src/app/api/admin/orders/[id]/route.ts）に既に戻しているため、
    // ここで戻すと同じ在庫が二重に加算される。
    if (!FINAL_STATUSES.includes(order.status)) {
      await restoreOrderInventory(order, id);
    }

    // 返金完了としてステータスを更新
    await updateOrderStatus(id, {
      status: 'refunded',
      paymentStatus: 'refunded',
      refundId,
    });

    return NextResponse.json({
      success: true,
      refundId,
      status: refundStatus,
      amount: order.total,
    });
  } catch (error) {
    console.error('注文の返金エラー:', error);
    const message = error instanceof Error ? error.message : '返金処理に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
