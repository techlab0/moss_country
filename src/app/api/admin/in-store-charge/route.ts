import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { createPaymentLink, convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square';

// 店頭でカード決済端末を使わずに決済を受け付けるためのQRコード決済リンクを発行する。
// お客様が自分のスマホで読み取り、Squareのホスト型決済ページで支払う（カード情報は当システムを経由しない）。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: '金額が不正です' }, { status: 400 });
    }
    const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : undefined;

    const idempotencyKey = uuidv4();
    const paymentLink = await createPaymentLink({
      idempotencyKey,
      quickPay: {
        name: description ? `MOSS COUNTRY 店頭会計: ${description}` : 'MOSS COUNTRY 店頭会計',
        priceMoney: {
          amount: convertToSquareAmount(amount),
          currency: SQUARE_CONFIG.currency,
        },
        locationId: SQUARE_CONFIG.locationId,
      },
      checkoutOptions: {
        allowTipping: false,
        redirectUrl: `${SQUARE_CONFIG.appBaseUrl}/payment/success`,
      },
    });

    const charge = await writeClient.create({
      _type: 'inStoreCharge',
      amount,
      description,
      squareOrderId: paymentLink.orderId,
      paymentLinkUrl: paymentLink.url,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const QRCode = await import('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(paymentLink.url, { width: 400 });

    return NextResponse.json({
      charge,
      paymentUrl: paymentLink.url,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error('店頭決済リンク作成エラー:', error);
    return NextResponse.json(
      { error: '決済リンクの作成に失敗しました' },
      { status: 500 }
    );
  }
}

// 直近の店頭決済一覧（履歴表示・当日集計の裏付け確認用）
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const charges = await writeClient.fetch(`
      *[_type == "inStoreCharge"] | order(createdAt desc) [0...30] {
        _id, amount, description, status, createdAt, paidAt
      }
    `);

    return NextResponse.json({ charges });
  } catch (error) {
    console.error('店頭決済一覧取得エラー:', error);
    return NextResponse.json(
      { error: '一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
