import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyAdminSession } from '@/lib/auth';
import { getOrderById, updateOrderStatus } from '@/lib/orders';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import { restoreOrderInventory } from '@/lib/orderInventory';
import { refundPayment as refundSquarePayment } from '@/lib/square';
import { getPaymentStatus as getPaypayPaymentStatus, refundPayment as refundPaypayPayment } from '@/lib/paypayWebClient';

// EC注文の返金。お客様に実際に返金する（カード決済はSquare、PayPay決済はPayPay経由）。
// キャンセル（在庫を戻してステータス変更するだけ）とは異なり、実際に決済が取り消される。
//
// 金額を指定すると一部返金になる（送料の取りすぎを返す場合など）。省略すると残額全額。
// 一部返金では商品自体はお届けするため在庫を戻さない。全額返金になった時点で在庫を戻す。

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

    // 未決済（銀行振込・代引の入金前など）は返金対象ではない。キャンセルを使う。
    if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'partially_refunded') {
      return NextResponse.json(
        { error: '支払い済みの注文のみ返金できます。未決済の注文はキャンセルしてください' },
        { status: 400 }
      );
    }

    if (!order.total || order.total <= 0) {
      return NextResponse.json({ error: '返金額が不正です' }, { status: 400 });
    }

    // 返金可能な残額。一部返金を繰り返しても合計が決済額を超えないようにする。
    const alreadyRefunded = order.refundedAmount || 0;
    const refundableAmount = order.total - alreadyRefunded;
    if (refundableAmount <= 0) {
      return NextResponse.json({ error: 'この注文は既に全額返金済みです' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedAmount = body?.amount === undefined || body?.amount === null || body?.amount === ''
      ? refundableAmount
      : Number(body.amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ error: '返金額は1円以上で指定してください' }, { status: 400 });
    }
    const refundAmount = Math.round(requestedAmount);
    if (refundAmount > refundableAmount) {
      return NextResponse.json(
        { error: `返金可能な残額は¥${refundableAmount.toLocaleString()}です` },
        { status: 400 }
      );
    }
    const isFullRefund = alreadyRefunded + refundAmount >= order.total;

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
        amountJpy: refundAmount,
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
      const refund = await refundSquarePayment(order.squarePaymentId, refundAmount, uuidv4());
      refundId = refund.id;
      refundStatus = refund.status;
    }

    // 確定済み在庫を戻すのは全額返金のときだけ。一部返金（送料の返金など）は
    // 商品自体はお届けするため在庫は戻さない。
    // キャンセル済みの注文はステータス変更時に既に戻しているため、二重加算を避けて除外する。
    if (isFullRefund && !FINAL_STATUSES.includes(order.status)) {
      await restoreOrderInventory(order, id);
    }

    // 返金結果を反映する。一部返金では注文自体は生きているため status は変えない。
    await updateOrderStatus(id, {
      ...(isFullRefund ? { status: 'refunded' as const } : {}),
      paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
      refundId,
      refundedAmount: alreadyRefunded + refundAmount,
    });

    // 返金完了のお知らせ。返金は既に成立しているため、送信に失敗しても処理は成功として返す。
    // 店舗にもBCCで控えを送り、お客様に届かない場合に気づけるようにする。
    if (order.customerEmail) {
      const customerName = [order.customerLastName, order.customerFirstName].filter(Boolean).join(' ');
      await sendMail({
        to: order.customerEmail,
        replyTo: STORE_EMAIL,
        bcc: STORE_EMAIL,
        subject: `【MOSS COUNTRY】ご返金のお知らせ (注文番号: ${order.orderNumber})`,
        text: [
          customerName ? `${customerName} 様` : 'お客様',
          '',
          isFullRefund
            ? 'ご注文について、お支払いいただいた全額を返金いたしました。'
            : 'ご注文について、下記の金額を返金いたしました。',
          '',
          `注文番号: ${order.orderNumber}`,
          `返金金額: ¥${refundAmount.toLocaleString()}`,
          isFullRefund ? null : `お支払い金額: ¥${(order.total ?? 0).toLocaleString()}`,
          `返金方法: ${order.paymentMethod === 'paypay' ? 'PayPay' : 'クレジットカード'}`,
          '',
          '返金の反映までにはお支払い方法により数日かかる場合があります。',
          'ご不明な点がございましたら本メールへ返信にてお問い合わせください。',
          '',
          '----',
          'MOSS COUNTRY',
        ].filter((line): line is string => line !== null).join('\n'),
      });
    }

    return NextResponse.json({
      success: true,
      refundId,
      status: refundStatus,
      amount: refundAmount,
      refundedAmount: alreadyRefunded + refundAmount,
      isFullRefund,
    });
  } catch (error) {
    console.error('注文の返金エラー:', error);
    const message = error instanceof Error ? error.message : '返金処理に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
