import { NextResponse } from 'next/server';
import { getShippingSettings } from '@/lib/shipping';

// 公開エンドポイント。checkout が送料表示に使うため、送料設定（マージ済み・デフォルト補完済み）を返す。
// 秘密情報は含まない（料金表・ゾーン・しきい値のみ）。
export async function GET() {
  try {
    const settings = await getShippingSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('送料設定の取得に失敗:', error);
    return NextResponse.json({ error: '送料設定の取得に失敗しました' }, { status: 500 });
  }
}
