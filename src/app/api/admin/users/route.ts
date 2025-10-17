import { NextRequest, NextResponse } from 'next/server';
import { getUsers, findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // セッションから管理者認証を確認
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

    const users = await getUsers();
    
    // 配列チェック
    if (!Array.isArray(users)) {
      console.error('getUsers() returned non-array:', users);
      return NextResponse.json({ error: 'ユーザーデータの取得に失敗しました' }, { status: 500 });
    }
    
    // パスワードハッシュを除外してレスポンス
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      phoneNumber: user.phoneNumber,
      lastLogin: user.lastLogin?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({ users: safeUsers });

  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 });
  }
}