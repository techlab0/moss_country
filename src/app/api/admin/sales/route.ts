import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

// 過去の日別売上の簡易履歴（直近60件）
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const entries = await writeClient.fetch(`
      *[_type == "dailySales"] | order(date desc) [0...60] {
        date,
        cashAmount,
        payPayAmount,
        manualCardAmount,
        wordOfMouthDiscount,
        adjustment,
        "itemCount": count(lineItems)
      }
    `);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('日別売上履歴取得エラー:', error);
    return NextResponse.json(
      { error: '売上履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
