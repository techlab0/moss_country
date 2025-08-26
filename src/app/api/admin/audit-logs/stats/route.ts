import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogStats } from '@/lib/auditLog';
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

    // 監査ログ統計を取得
    const stats = getAuditLogStats();

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Audit log stats fetch error:', error);
    return NextResponse.json({ error: '統計情報の取得に失敗しました' }, { status: 500 });
  }
}