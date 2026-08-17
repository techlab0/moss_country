// Googleの許可画面からの戻り先。Google Cloudの「承認済みのリダイレクトURI」に
// 登録した値（環境変数 GMAIL_OAUTH_REDIRECT_URI）と、このルートのパスは一致していなければならない。
//
// 完了後は管理画面のGmail連携タブへ戻す。結果はクエリパラメータで伝える。

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { exchangeCodeAndSave, GMAIL_OAUTH_STATE_COOKIE } from '@/lib/gmailOAuth';

const RETURN_PATH = '/admin/workshop-bookings?tab=gmail';

function backToAdmin(request: NextRequest, params: Record<string, string>) {
  const url = new URL(RETURN_PATH, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  // 使い終わったstateは残さない
  response.cookies.delete(GMAIL_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    // 未ログインの場合は middleware（src/middleware.ts の /api/admin/:path* 判定）が
    // ここへ来る前に401を返す。ここでの確認は connected_by に記録する管理者を得るためのもの。
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;

    // 利用者が「許可」せずキャンセルした場合はerrorだけが返る
    const oauthError = params.get('error');
    if (oauthError) {
      return backToAdmin(request, { gmail: 'error', reason: oauthError });
    }

    const code = params.get('code');
    if (!code) {
      return backToAdmin(request, { gmail: 'error', reason: 'missing_code' });
    }

    const expectedState = request.cookies.get(GMAIL_OAUTH_STATE_COOKIE)?.value;
    const actualState = params.get('state');
    if (!expectedState || !actualState || expectedState !== actualState) {
      // 自分が始めたフローの戻りではない可能性があるので、トークン交換はしない
      return backToAdmin(request, { gmail: 'error', reason: 'state_mismatch' });
    }

    const email = await exchangeCodeAndSave(code, session.email);

    return backToAdmin(request, {
      gmail: 'connected',
      ...(email ? { email } : {}),
    });
  } catch (error) {
    console.error('Gmail callback error:', error);
    return backToAdmin(request, {
      gmail: 'error',
      reason: 'exchange_failed',
      message: error instanceof Error ? error.message : '不明なエラー',
    });
  }
}
