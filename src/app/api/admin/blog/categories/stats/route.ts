import { NextRequest, NextResponse } from 'next/server';
import { getBlogCategoryStats } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const stats = await getBlogCategoryStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch blog category stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog category stats' },
      { status: 500 }
    );
  }
}