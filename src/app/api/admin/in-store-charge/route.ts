import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { createPaymentLink, convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square';

interface LineItemInput {
  salesItemId: string;
  quantity?: number;
  amount?: number;
}

// 店頭でカード決済端末を使わずに決済を受け付けるためのQRコード決済リンクを発行する。
// お客様が自分のスマホで読み取り、Squareのホスト型決済ページで支払う（カード情報は当システムを経由しない）。
// 金額はクライアントの申告値を信用せず、カタログの単価から必ずサーバー側で再計算する。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const lineItemsInput: LineItemInput[] = Array.isArray(body.lineItems) ? body.lineItems : [];
    const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : undefined;

    if (lineItemsInput.length === 0) {
      return NextResponse.json({ error: '商品を1つ以上選択してください' }, { status: 400 });
    }

    const salesItemIds = lineItemsInput.map(item => item.salesItemId).filter(Boolean);
    const salesItemsMeta: Array<{ _id: string; name: string; pricingType: string; unitPrice?: number }> = await writeClient.fetch(
      `*[_type == "salesItem" && _id in $ids]{ _id, name, pricingType, unitPrice }`,
      { ids: salesItemIds }
    );
    const metaById = new Map(salesItemsMeta.map(m => [m._id, m]));

    let amount = 0;
    const lineItems = [];
    for (const item of lineItemsInput) {
      const meta = metaById.get(item.salesItemId);
      if (!meta) {
        return NextResponse.json({ error: `商品が見つかりません: ${item.salesItemId}` }, { status: 400 });
      }
      const lineTotal = meta.pricingType === 'fixed'
        ? (item.quantity || 0) * (meta.unitPrice || 0)
        : (item.amount || 0);
      if (lineTotal <= 0) continue;

      amount += lineTotal;
      lineItems.push({
        _type: 'lineItem',
        _key: item.salesItemId,
        salesItem: { _type: 'reference', _ref: item.salesItemId },
        name: meta.name,
        quantity: meta.pricingType === 'fixed' ? item.quantity : undefined,
        amount: meta.pricingType === 'fixed' ? lineTotal : item.amount,
      });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: '合計金額が0円です。数量または金額を入力してください' }, { status: 400 });
    }

    // 先にドキュメントを作成してIDを確定させ、決済完了後のレシートURLに使う
    const charge = await writeClient.create({
      _type: 'inStoreCharge',
      amount,
      description,
      lineItems,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const receiptUrl = `${SQUARE_CONFIG.appBaseUrl}/receipt/${charge._id}`;
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
        // 決済完了後、お客様のスマホにレシート画面を表示する
        redirectUrl: receiptUrl,
      },
    });

    const updatedCharge = await writeClient
      .patch(charge._id)
      .set({ squareOrderId: paymentLink.orderId, paymentLinkUrl: paymentLink.url })
      .commit();

    const QRCode = await import('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(paymentLink.url, { width: 400 });

    return NextResponse.json({
      charge: updatedCharge,
      paymentUrl: paymentLink.url,
      qrCodeDataUrl,
      receiptUrl,
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
        _id, amount, description, status, createdAt, paidAt,
        lineItems[]{ name, quantity, amount }
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
