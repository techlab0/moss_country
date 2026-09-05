import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getQrPaymentStatus } from '@/lib/paypay';
import { syncChargeToSheetById } from '@/lib/salesBackup';
import {
  applyStoreSaleInventory,
  storeInventoryFailureFields,
  storeInventoryResultFields,
  type StoreInventoryLine,
  type StoreInventoryWarning,
} from '@/lib/storeInventory';

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
      lineItems?: StoreInventoryLine[];
      inventoryProcessed?: boolean;
      inventoryWarnings?: StoreInventoryWarning[];
    } | null = await writeClient.fetch(
      `*[_type == "inStoreCharge" && _id == $id][0]{
        _id, status, paypayMerchantPaymentId, inventoryProcessed,
        inventoryWarnings[]{ itemName, message },
        lineItems[]{ name, quantity, "salesItemId": salesItem._ref }
      }`,
      { id }
    );

    if (!charge) {
      return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 });
    }

    // 既に確定済みなら再度PayPayへ問い合わせず、そのまま返す（冪等）
    if (charge.status !== 'pending') {
      return NextResponse.json({
        status: charge.status,
        inventoryProcessed: charge.inventoryProcessed,
        inventoryWarnings: charge.inventoryWarnings || [],
      });
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
      // EC商品が紐づく明細の在庫を引き落とす。ここへ来るのは status が pending の場合だけなので
      // 二重に引き落とされることはない。失敗しても決済確定は覆さない。
      try {
        const inventoryResult = await applyStoreSaleInventory(charge.lineItems || [], `店頭QR決済 ${id}`);
        await writeClient.patch(id).set(storeInventoryResultFields(inventoryResult)).commit();
        charge.inventoryWarnings = inventoryResult.warnings;
      } catch (inventoryError) {
        console.error('店頭QR決済の在庫引き落としに失敗しました（棚卸しで調整してください）:', inventoryError);
        const failureFields = storeInventoryFailureFields();
        await writeClient.patch(id).set(failureFields).commit();
        charge.inventoryWarnings = failureFields.inventoryWarnings;
      }

      // バックアップ用Googleスプレッドシート同期（await-and-swallow。Cronの保険が無いため
      // 完了を待つ。失敗してもこの決済確定処理・レスポンスには一切影響させない）
      try {
        await syncChargeToSheetById(id);
      } catch {
        // syncChargeToSheetById内部で既にログ済みのため、ここでは握りつぶすのみ
      }
      return NextResponse.json({
        status: 'paid',
        inventoryProcessed: true,
        inventoryWarnings: charge.inventoryWarnings || [],
      });
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
