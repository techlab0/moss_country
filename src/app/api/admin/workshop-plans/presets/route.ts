import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { workshopCoursePresets } from '@/lib/workshopCoursePresets';

// 指定済みのコース一覧をすべて「非表示」で初期登録する。
// createIfNotExists により、同じIDの既存コースを上書きしない。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const transaction = writeClient.transaction();
    for (const preset of workshopCoursePresets) {
      transaction.createIfNotExists({
        _type: 'simpleWorkshop',
        ...preset,
      });
    }
    await transaction.commit();

    return NextResponse.json({ success: true, count: workshopCoursePresets.length });
  } catch (error) {
    console.error('ワークショップコース初期登録エラー:', error);
    return NextResponse.json({ error: 'コース一覧の初期登録に失敗しました' }, { status: 500 });
  }
}
