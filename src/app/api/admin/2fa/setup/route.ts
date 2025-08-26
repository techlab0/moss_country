import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { generateTwoFactorSetup } from '@/lib/twoFactor';
import { generateWebAuthnRegistrationOptions } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    // 管理者認証を確認
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const method = body.method || 'totp';

    if (method === 'webauthn') {
      // WebAuthn登録オプションを生成
      const options = await generateWebAuthnRegistrationOptions(
        session.userId,
        session.email
      );
      
      return NextResponse.json({
        method: 'webauthn',
        options,
      });
    } else {
      // TOTP (Google Authenticator) 設定を生成
      const setupData = await generateTwoFactorSetup();
      
      return NextResponse.json({
        method: 'totp',
        ...setupData,
      });
    }

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: '2FA設定の生成に失敗しました' },
      { status: 500 }
    );
  }
}