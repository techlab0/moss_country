import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';

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

    const { secret, backupCodes } = await request.json();

    if (!secret || !backupCodes) {
      return NextResponse.json(
        { error: 'シークレットとバックアップコードが必要です' },
        { status: 400 }
      );
    }

    // 本来はデータベースに保存するが、ここでは環境変数のガイダンスを提供
    const envUpdate = `
# 以下を .env.local に追加してください:
ADMIN_2FA_SECRET="${secret}"
ADMIN_BACKUP_CODES="${backupCodes.join(',')}"
ADMIN_2FA_ENABLED="true"
`;

    console.log('=== 2FA設定完了 ===');
    console.log('以下の環境変数を .env.local に追加してください:');
    console.log(`ADMIN_2FA_SECRET="${secret}"`);
    console.log(`ADMIN_BACKUP_CODES="${backupCodes.join(',')}"`);
    console.log(`ADMIN_2FA_ENABLED="true"`);
    console.log('==================');

    return NextResponse.json({ 
      success: true,
      message: '2FA設定が完了しました。サーバーログを確認して環境変数を設定してください。',
      envUpdate
    });

  } catch (error) {
    console.error('2FA setup completion error:', error);
    return NextResponse.json(
      { error: '2FA設定の完了に失敗しました' },
      { status: 500 }
    );
  }
}