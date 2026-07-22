import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { getPaymentByPosTransactionId, convertToSquareAmount } from '@/lib/square';
import { syncChargeToSheetById } from '@/lib/salesBackup';

// Square POS API（square-commerce-v1:// ディープリンク）の callback_url。
// 決済後、Square POSアプリがこのURLを開いて結果（transaction_id, status, state）を返す。
//
// 重要（なりすまし対策）: このエンドポイントは公開で、誰でも任意のパラメータで叩ける。
// そのため callback の status は信用せず、必ずサーバー側で Square API に問い合わせて
// 「その transaction_id に対応する決済が実際に COMPLETED で、金額が一致するか」を照合してから
// paid に確定する。署名付きの Webhook(payment.updated) が最終的な二重確認になる。

interface PosCallbackData {
  transaction_id?: string;
  client_transaction_id?: string;
  status?: string; // 'ok' | 'error'
  state?: string; // 発行時に載せた inStoreCharge の _id
  error_code?: string;
}

function parseData(raw: string | null): PosCallbackData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PosCallbackData;
  } catch {
    return null;
  }
}

async function extractData(request: NextRequest): Promise<PosCallbackData | null> {
  // iOS モバイルWebは callback_url を GET で開き data クエリにJSONを載せる
  const fromQuery = new URL(request.url).searchParams.get('data');
  if (fromQuery) return parseData(fromQuery);

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        const body = await request.json();
        return parseData(typeof body?.data === 'string' ? body.data : JSON.stringify(body));
      }
      const form = await request.formData();
      const value = form.get('data');
      return parseData(typeof value === 'string' ? value : null);
    } catch {
      return null;
    }
  }
  return null;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const resultRedirect = (chargeId: string, status?: string) => {
    const url = new URL(`/receipt/${chargeId}`, origin);
    if (status) url.searchParams.set('pos', status);
    return NextResponse.redirect(url);
  };

  const data = await extractData(request);
  const chargeId = data?.state;
  if (!chargeId) {
    return NextResponse.redirect(new URL('/receipt/unknown?pos=error', origin));
  }

  // 対象の会計を取得（POSモードのもののみ）
  const charge = await writeClient.fetch(
    `*[_id == $id && _type == "inStoreCharge"][0]{ _id, amount, status, method }`,
    { id: chargeId }
  );
  if (!charge) {
    return NextResponse.redirect(new URL('/receipt/unknown?pos=notfound', origin));
  }

  // 既に確定済みなら二重処理しない（Webフックと競合しても安全）
  if (charge.status === 'paid') {
    return resultRedirect(chargeId);
  }

  // 決済失敗・キャンセル。pending のまま残し、管理画面から取り消せるようにする。
  if (data?.status !== 'ok' || !data.transaction_id) {
    return resultRedirect(chargeId, 'failed');
  }

  // Square API で実照合してから paid 確定
  try {
    const found = await getPaymentByPosTransactionId(data.transaction_id);
    const payment = found?.payment;
    const isCompleted = payment?.status === 'COMPLETED';
    const amountMatches = payment?.amount_money?.amount === convertToSquareAmount(charge.amount);

    if (!found || !isCompleted || !amountMatches) {
      console.error('POS callback verification failed', {
        chargeId,
        transactionId: data.transaction_id,
        found: !!found,
        paymentStatus: payment?.status,
        amountMatches,
      });
      return resultRedirect(chargeId, 'unverified');
    }

    await writeClient
      .patch(chargeId)
      .set({
        status: 'paid',
        squareOrderId: found.orderId,
        squarePaymentId: found.paymentId,
        posTransactionId: data.transaction_id,
        posClientTransactionId: data.client_transaction_id,
        paidAt: new Date().toISOString(),
      })
      .commit();

    // バックアップ用Googleスプレッドシート同期（await-and-swallow。Cronの保険が無いため
    // 完了を待つ。失敗してもこの決済確定処理・リダイレクトには一切影響させない）
    try {
      await syncChargeToSheetById(chargeId);
    } catch {
      // syncChargeToSheetById内部で既にログ済みのため、ここでは握りつぶすのみ
    }

    return resultRedirect(chargeId);
  } catch (error) {
    console.error('POS callback processing error:', error);
    return resultRedirect(chargeId, 'error');
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
