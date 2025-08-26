import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/auditLog';
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

    const currentUser = findUserById(payload.userId as string);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity') || undefined;
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;

    // 監査ログを取得
    const logs = getAuditLogs({
      limit,
      offset,
      severity: severity as any,
      action: action as any,
      userId,
    });

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
        hasMore: logs.length === limit,
      }
    });

  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json({ error: '監査ログの取得に失敗しました' }, { status: 500 });
  }
}