import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

// 決済完了後、お客様のスマホに表示するレシート用の公開エンドポイント（認証不要）。
// 店頭QR決済(inStoreCharge)の金額・明細・ステータスのみを返し、管理用の情報は含めない。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const charge = await writeClient.fetch(
      `*[_id == $id && _type == "inStoreCharge"][0]{
        amount, description, status, createdAt, paidAt,
        lineItems[]{ name, quantity, amount }
      }`,
      { id }
    );

    if (!charge) {
      return NextResponse.json({ error: 'レシートが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ charge });
  } catch (error) {
    console.error('レシート取得エラー:', error);
    return NextResponse.json(
      { error: 'レシートの取得に失敗しました' },
      { status: 500 }
    );
  }
}
