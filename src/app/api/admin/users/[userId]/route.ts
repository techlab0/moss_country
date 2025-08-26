import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const currentUser = findUserById(payload.userId as string);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { userId } = params;

    // 自分自身を削除することを防ぐ
    if (currentUser.id === userId) {
      return NextResponse.json({ 
        error: '自分自身を削除することはできません' 
      }, { status: 400 });
    }

    // ユーザーが存在するかチェック
    const userToDelete = findUserById(userId);
    if (!userToDelete) {
      return NextResponse.json({ 
        error: 'ユーザーが見つかりません' 
      }, { status: 404 });
    }

    // ユーザーを削除
    const success = deleteUser(userId);
    
    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'ユーザーが削除されました' 
      });
    } else {
      return NextResponse.json({ 
        error: 'ユーザーの削除に失敗しました' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json({ 
      error: 'ユーザーの削除に失敗しました' 
    }, { status: 500 });
  }
}