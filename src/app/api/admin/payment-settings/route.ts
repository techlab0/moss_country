import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

// 店頭決済設定（PayPay店舗用QRコード画像など）のシングルトンドキュメント。
// 保存直後の再取得で古い値が返らないよう、CDNを経由しない writeClient で読む。
const DOC_ID = 'paymentSettings-singleton';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const settings = await writeClient.fetch(
      `*[_id == $id][0]{ "payPayQrUrl": payPayQrImage.asset->url, updatedAt }`,
      { id: DOC_ID }
    );

    return NextResponse.json({ settings: settings || null });
  } catch (error) {
    console.error('店頭決済設定取得エラー:', error);
    return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
  }
}

// PUT: PayPay QR画像の設定・解除
// body: { payPayQrAssetId?: string | null }（/api/admin/images/upload が返す asset._id。null で解除）
export async function PUT(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const assetId = body.payPayQrAssetId;
    if (assetId !== null && typeof assetId !== 'string') {
      return NextResponse.json({ error: '画像の指定が不正です' }, { status: 400 });
    }

    const payPayQrImage = assetId
      ? { _type: 'image', asset: { _type: 'reference', _ref: assetId } }
      : null;

    await writeClient.createIfNotExists({ _id: DOC_ID, _type: 'paymentSettings' });
    const patch = writeClient.patch(DOC_ID).set({ updatedAt: new Date().toISOString() });
    if (payPayQrImage) {
      patch.set({ payPayQrImage });
    } else {
      patch.unset(['payPayQrImage']);
    }
    await patch.commit();

    const settings = await writeClient.fetch(
      `*[_id == $id][0]{ "payPayQrUrl": payPayQrImage.asset->url, updatedAt }`,
      { id: DOC_ID }
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('店頭決済設定保存エラー:', error);
    return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 });
  }
}
