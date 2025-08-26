import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { comparePassword, hashPassword } from '@/lib/userManager';
import { getAdminUsers, updateAdminUser } from '@/lib/userManager';

export async function POST(request: NextRequest) {
  try {
    // JWTトークンを検証
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと新しいパスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワード複雑性チェック
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で、大文字・小文字・数字・特殊文字を含む必要があります' },
        { status: 400 }
      );
    }

    // 現在のユーザー情報を取得
    const users = await getAdminUsers();
    const currentUser = users.find(u => u.id === userId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 現在のパスワードを検証
    const isCurrentPasswordValid = await comparePassword(currentPassword, currentUser.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 400 }
      );
    }

    // 新しいパスワードが現在のパスワードと同じでないことを確認
    const isSamePassword = await comparePassword(newPassword, currentUser.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なる必要があります' },
        { status: 400 }
      );
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = await hashPassword(newPassword);

    // パスワードを更新
    await updateAdminUser(userId, {
      passwordHash: newPasswordHash,
    });

    console.log(`Password changed for user: ${currentUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'パスワードが正常に変更されました',
    });

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'パスワード変更中にエラーが発生しました' },
      { status: 500 }
    );
  }
}