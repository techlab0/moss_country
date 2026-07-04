import { NextRequest, NextResponse } from 'next/server';
import { generateWebAuthnAuthenticationOptions, verifyWebAuthnAuthentication } from '@/lib/webauthn';
import { verifyJWT } from '@/lib/auth';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 認証オプション生成の場合
    if (body.action === 'generate-options') {
      // ログイン時の2FA検証はパスワード認証直後の一時セッションを使う（本セッションはまだ発行されていない）
      const token = request.cookies.get('admin-temp-session')?.value;
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
      const options = await generateWebAuthnAuthenticationOptions(userId);

      return NextResponse.json({
        success: true,
        options,
      });
    }

    // 認証検証の場合
    if (body.action === 'verify-authentication') {
      // ログイン時の2FA検証はパスワード認証直後の一時セッションを使う（本セッションはまだ発行されていない）
      const token = request.cookies.get('admin-temp-session')?.value;
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
      const { credential }: { credential: AuthenticationResponseJSON } = body;

      if (!credential) {
        return NextResponse.json(
          { error: '認証情報が不正です' },
          { status: 400 }
        );
      }

      const result = await verifyWebAuthnAuthentication(userId, credential);

      if (result.verified) {
        return NextResponse.json({
          success: true,
          verified: true,
        });
      } else {
        return NextResponse.json(
          { error: 'WebAuthn認証に失敗しました' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: '無効なアクションです' },
      { status: 400 }
    );
  } catch (error) {
    console.error('WebAuthn authentication error:', error);
    return NextResponse.json(
      { error: 'WebAuthn認証中にエラーが発生しました' },
      { status: 500 }
    );
  }
}