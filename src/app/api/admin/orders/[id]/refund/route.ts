import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyAdminSession } from '@/lib/auth';
import { getOrderById, updateOrderStatus } from '@/lib/orders';
import { restoreOrderInventory } from '@/lib/orderInventory';
import { refundPayment } from '@/lib/square';

// EC注文の返金。お客様のカードにSquare経由で実際に全額返金する。
// キャンセル（在庫を戻してステータス変更するだけ）とは異なり、実際に決済が取り消される。
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

    // カード決済のSquare Payment IDが無いと返金APIを呼べない
    if (!order.squarePaymentId) {
      return NextResponse.json(
        { error: '決済IDが記録されていないため返金できません。Squareダッシュボードから返金してください' },
        { status: 400 }
      );
    }

    if (!order.total || order.total <= 0) {
      return NextResponse.json({ error: '返金額が不正です' }, { status: 400 });
    }

    // Squareで全額返金（お客様のカードに実際に返金される）
    const refund = await refundPayment(order.squarePaymentId, order.total, uuidv4());

    // 確定済み在庫を戻す
    await restoreOrderInventory(order, id);

    // 返金完了としてステータスを更新
    await updateOrderStatus(id, {
      status: 'refunded',
      paymentStatus: 'refunded',
      refundId: refund.id,
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: order.total,
    });
  } catch (error) {
    console.error('注文の返金エラー:', error);
    const message = error instanceof Error ? error.message : '返金処理に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
