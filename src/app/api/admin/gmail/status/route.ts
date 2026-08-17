// Gmail連携の状態確認と解除。
// トークン本体は返さない（getGmailConnectionが表示用の項目だけを返す）。

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import {
  getGmailConnection,
  disconnectGmail,
  isGmailConfigured,
  GMAIL_SCOPE,
} from '@/lib/gmailOAuth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const configured = isGmailConfigured();
    if (!configured) {
      return NextResponse.json({ configured: false, connected: false, expectedScope: GMAIL_SCOPE });
    }

    const connection = await getGmailConnection();

    return NextResponse.json({
      configured: true,
      connected: !!connection,
      expectedScope: GMAIL_SCOPE,
      connection,
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    await disconnectGmail();

    return NextResponse.json({ success: true, message: 'Gmail連携を解除しました' });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
