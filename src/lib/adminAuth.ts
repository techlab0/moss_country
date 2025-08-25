import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';

// 管理者認証を必要とするAPIハンドラーをラップする関数
export function withAdminAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getAdminSessionFromRequest(request);
      
      if (!session) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        );
      }

      // 認証されたリクエストを元のハンドラーに渡す
      return await handler(request);
    } catch (error) {
      console.error('Admin auth error:', error);
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      );
    }
  };
}