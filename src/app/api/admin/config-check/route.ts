import { NextRequest, NextResponse } from 'next/server';
import { validateProductionConfig } from '@/lib/config';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const configStatus = validateProductionConfig();
    
    return NextResponse.json(configStatus);
  } catch (error) {
    console.error('Config check error:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}