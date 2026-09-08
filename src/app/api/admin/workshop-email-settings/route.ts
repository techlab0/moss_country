import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import {
  defaultWorkshopEmailSettings,
  getWorkshopEmailSettings,
  saveWorkshopEmailSettings,
} from '@/lib/workshopEmailSettings';

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    return NextResponse.json({ settings: await getWorkshopEmailSettings() });
  } catch (error) {
    console.error('ワークショップ自動返信設定の取得に失敗:', error);
    return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const input = await request.json();
    const subject = typeof input?.subject === 'string' ? input.subject.trim() : '';
    const body = typeof input?.body === 'string' ? input.body.trim() : '';
    if (!subject || !body) {
      return NextResponse.json({ error: '件名と本文は必須です' }, { status: 400 });
    }
    if (subject.length > 200 || body.length > 10000) {
      return NextResponse.json({ error: '件名または本文が長すぎます' }, { status: 400 });
    }
    await saveWorkshopEmailSettings({ subject, body });
    return NextResponse.json({ settings: { subject, body } });
  } catch (error) {
    console.error('ワークショップ自動返信設定の保存に失敗:', error);
    return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const settings = defaultWorkshopEmailSettings();
    await saveWorkshopEmailSettings(settings);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('ワークショップ自動返信設定の初期化に失敗:', error);
    return NextResponse.json({ error: '初期設定へ戻せませんでした' }, { status: 500 });
  }
}
