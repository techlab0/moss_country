// Gmail連携の開始。管理者をGoogleの許可画面へ送る。
// ブラウザのトップレベル遷移なので、CSRF対策としてランダムなstateを発行し、
// httpOnly Cookieに保存してcallback側で一致を確認する。

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyAdminSession } from '@/lib/auth';
import { buildAuthUrl, isGmailConfigured, GMAIL_OAUTH_STATE_COOKIE } from '@/lib/gmailOAuth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (!isGmailConfigured()) {
      return NextResponse.json(
        { error: 'Gmail連携の環境変数が設定されていません' },
        { status: 503 }
      );
    }

    const state = randomUUID();
    const response = NextResponse.redirect(buildAuthUrl(state));

    response.cookies.set(GMAIL_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // Googleからの戻りは外部サイトからのGET遷移なので、strictではCookieが送られない
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error('Gmail connect error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
