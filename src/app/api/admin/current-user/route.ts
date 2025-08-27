import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // セッションからユーザー認証を確認
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const currentUser = await findUserById(payload.userId as string);
    if (!currentUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // パスワードハッシュを除外して返す
    const safeUser = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      twoFactorEnabled: currentUser.twoFactorEnabled,
      twoFactorMethod: currentUser.twoFactorMethod,
      lastLogin: currentUser.lastLogin?.toISOString(),
      createdAt: currentUser.createdAt.toISOString(),
    };

    return NextResponse.json({ user: safeUser });

  } catch (error) {
    console.error('Current user fetch error:', error);
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 });
  }
}