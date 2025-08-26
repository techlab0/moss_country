import { NextRequest, NextResponse } from 'next/server';
import { verifyWebAuthnRegistration } from '@/lib/webauthn';
import { verifyJWT } from '@/lib/auth';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

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
    const { credential }: { credential: RegistrationResponseJSON } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { error: '認証情報が不正です' },
        { status: 400 }
      );
    }

    // WebAuthn登録を検証
    const result = await verifyWebAuthnRegistration(userId, credential);

    if (result.verified) {
      return NextResponse.json({
        success: true,
        credentialId: result.credentialID,
      });
    } else {
      return NextResponse.json(
        { error: 'WebAuthn登録の検証に失敗しました' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('WebAuthn registration verification error:', error);
    return NextResponse.json(
      { error: 'WebAuthn登録の検証中にエラーが発生しました' },
      { status: 500 }
    );
  }
}