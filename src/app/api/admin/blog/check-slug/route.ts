import { NextRequest, NextResponse } from 'next/server';
import { checkSlugExists } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { slug, excludeId } = await request.json();
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const exists = await checkSlugExists(slug, excludeId);
    
    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Failed to check slug:', error);
    return NextResponse.json(
      { error: 'Failed to check slug' },
      { status: 500 }
    );
  }
}