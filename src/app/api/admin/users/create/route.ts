import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';
import { logAuditEvent } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
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

    const { email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'メールアドレスとパスワードが必要です' 
      }, { status: 400 });
    }

    // パスワードの複雑性チェック
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'パスワードは8文字以上である必要があります' 
      }, { status: 400 });
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: '有効なメールアドレスを入力してください' 
      }, { status: 400 });
    }

    const newUser = await createUser(email, password, role || 'editor');
    
    // ユーザー作成を記録
    await logAuditEvent(
      currentUser.id,
      currentUser.email,
      'user.created',
      'user_management',
      {
        new_user_email: newUser.email,
        new_user_role: newUser.role,
      },
      {
        resourceId: newUser.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        severity: 'high'
      }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'ユーザーが作成されました',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt.toISOString(),
      }
    });

  } catch (error: any) {
    console.error('User creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    if (error.message?.includes('既に使用されています')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // より詳細なエラーメッセージを返す（開発環境のみ）
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment 
      ? `ユーザーの作成に失敗しました: ${error.message}`
      : 'ユーザーの作成に失敗しました';
    
    return NextResponse.json({ 
      error: errorMessage,
      ...(isDevelopment && { details: error.stack })
    }, { status: 500 });
  }
}