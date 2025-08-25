import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, findUserById } from '@/lib/userManager';
import { getUserFromSession } from '@/lib/multiFactorAuth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // セッションから管理者認証を確認
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const currentUser = await getUserFromSession(token);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const userId = params.id;
    
    // 自分自身の削除を防ぐ
    if (currentUser.id === userId) {
      return NextResponse.json({ 
        error: '自分自身を削除することはできません' 
      }, { status: 400 });
    }

    // 削除対象ユーザーの存在確認
    const targetUser = findUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ 
        error: 'ユーザーが見つかりません' 
      }, { status: 404 });
    }

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