import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { refundPayment, deletePaymentLink } from '@/lib/square';
import { cancelDynamicQr, getQrPaymentStatus, refundQrPayment } from '@/lib/paypay';
import { adjustDailyCounters, jstDateOf } from '@/lib/storeSales';
import { syncChargeToSheetById } from '@/lib/salesBackup';
import { revertStoreSaleInventory, type StoreInventoryLine } from '@/lib/storeInventory';

// 店頭QR決済のキャンセル（Square QR/POS・PayPay動的QR共通）。
// - 未払い(pending): 決済リンク/QRを削除（ベストエフォート）して cancelled にし、購入組数を戻す
// - 支払い済み(paid): 各決済手段の返金APIで全額返金し refunded にする（お客様に実際に返金される）
// 返金時に、決済確定時へ引き落とした在庫を戻す。
// 在庫のずれは棚卸しで調整する運用なので、失敗しても返金処理そのものは成立させる。
async function restoreChargeInventory(lineItems: StoreInventoryLine[] | undefined, chargeId: string) {
  try {
    await revertStoreSaleInventory(lineItems || [], `店頭決済の返金 ${chargeId}`);
  } catch (inventoryError) {
    console.error('店頭決済の返金時の在庫戻しに失敗しました（棚卸しで調整してください）:', inventoryError);
  }
}

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
      method?: string;
      squarePaymentId?: string;
      paymentLinkId?: string;
      paypayCodeId?: string;
      paypayMerchantPaymentId?: string;
      createdAt?: string;
      lineItems?: StoreInventoryLine[];
    } | null = await writeClient.fetch(
      `*[_type == "inStoreCharge" && _id == $id][0]{
        _id, status, amount, method, squarePaymentId, paymentLinkId, paypayCodeId, paypayMerchantPaymentId, createdAt,
        lineItems[]{ quantity, "salesItemId": salesItem._ref }
      }`,
      { id }
    );
    if (!charge) {
      return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 });
    }

    if (charge.status === 'pending') {
      if (charge.method === 'paypay') {
        // PayPay側のQRコード削除は失敗しても続行する（QRが残ってもお客様が支払わなければ実害はない）
        if (charge.paypayCodeId) {
          try {
            await cancelDynamicQr(charge.paypayCodeId);
          } catch (err) {
            console.error('PayPay QRコード削除に失敗しました（キャンセル処理は続行します）:', err);
          }
        }
      } else if (charge.paymentLinkId) {
        // Square側のリンク削除は失敗しても続行する（リンクが残ってもお客様が支払わなければ実害はない）
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
      // バックアップ用Googleスプレッドシート同期（await-and-swallow。Cronの保険が無いため
      // 完了を待つ。失敗してもこのキャンセル処理・レスポンスには一切影響させない）
      try {
        await syncChargeToSheetById(id);
      } catch {
        // syncChargeToSheetById内部で既にログ済みのため、ここでは握りつぶすのみ
      }
      return NextResponse.json({ charge: updated });
    }

    if (charge.status === 'paid') {
      if (charge.method === 'paypay') {
        if (!charge.paypayMerchantPaymentId) {
          return NextResponse.json(
            { error: 'PayPay決済情報が記録されていないため返金できません。PayPay for Businessから返金してください' },
            { status: 400 }
          );
        }

        // 返金にはPayPay側の paymentId（merchantPaymentIdとは別物）が必要なため、都度取得する
        const status = await getQrPaymentStatus(charge.paypayMerchantPaymentId);
        if (!status.paymentId) {
          return NextResponse.json(
            { error: 'PayPayの決済IDを取得できないため返金できません。PayPay for Businessから返金してください' },
            { status: 400 }
          );
        }

        const refund = await refundQrPayment({
          merchantRefundId: uuidv4(),
          paymentId: status.paymentId,
          amountJpy: charge.amount,
        });
        const updated = await writeClient
          .patch(id)
          .set({ status: 'refunded', paypayRefundId: refund.refundId })
          .commit();

        // 支払い済みの会計を返金したので、引き落とした在庫を戻す
        await restoreChargeInventory(charge.lineItems, id);
        // バックアップ用Googleスプレッドシート同期（await-and-swallow。Cronの保険が無いため
        // 完了を待つ。失敗してもこの返金処理・レスポンスには一切影響させない）
        try {
          await syncChargeToSheetById(id);
        } catch {
          // syncChargeToSheetById内部で既にログ済みのため、ここでは握りつぶすのみ
        }
        return NextResponse.json({ charge: updated });
      }

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

      // 支払い済みの会計を返金したので、引き落とした在庫を戻す
      await restoreChargeInventory(charge.lineItems, id);
      // バックアップ用Googleスプレッドシート同期（await-and-swallow。Cronの保険が無いため
      // 完了を待つ。失敗してもこの返金処理・レスポンスには一切影響させない）
      try {
        await syncChargeToSheetById(id);
      } catch {
        // syncChargeToSheetById内部で既にログ済みのため、ここでは握りつぶすのみ
      }
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
