import { NextRequest, NextResponse } from 'next/server';
import { detectSecurityAlerts } from '@/lib/auditLog';
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

    // セキュリティアラートを検出
    const { alerts } = await detectSecurityAlerts();

    return NextResponse.json({ alerts });

  } catch (error) {
    console.error('Security alerts fetch error:', error);
    return NextResponse.json({ error: 'セキュリティアラートの取得に失敗しました' }, { status: 500 });
  }
}