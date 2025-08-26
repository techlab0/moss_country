import { NextRequest, NextResponse } from 'next/server';
import { generateWebAuthnRegistrationOptions } from '@/lib/webauthn';
import { verifyJWT } from '@/lib/auth';

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
    const userEmail = payload.email as string;

    // WebAuthn登録オプションを生成
    const options = await generateWebAuthnRegistrationOptions(userId, userEmail);

    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error) {
    console.error('WebAuthn registration setup error:', error);
    return NextResponse.json(
      { error: 'WebAuthn登録の準備に失敗しました' },
      { status: 500 }
    );
  }
}