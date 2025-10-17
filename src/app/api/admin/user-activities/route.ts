import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserActivities,
  getUserStatistics
} from '@/lib/advancedUserManager';
import { findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 管理者認証を確認
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const currentUser = await findUserById(payload.userId as string);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // 統計情報を取得
      const stats = await getUserStatistics();
      return NextResponse.json({ stats });
    }

    // アクティビティログを取得
    const userId = searchParams.get('userId') || undefined;
    const actionFilter = searchParams.get('actionFilter') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const activities = getUserActivities({
      userId,
      action: actionFilter,
      resource,
      limit,
      offset,
      startDate,
      endDate
    });

    return NextResponse.json({
      activities,
      pagination: {
        limit,
        offset,
        hasMore: activities.length === limit
      }
    });

  } catch (error) {
    console.error('User activities fetch error:', error);
    return NextResponse.json({ error: 'ユーザーアクティビティの取得に失敗しました' }, { status: 500 });
  }
}