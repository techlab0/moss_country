import { NextRequest, NextResponse } from 'next/server';
import { generateSEOFriendlySlug } from '@/lib/slugUtils';
import { generateUniqueSlug } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { title, excludeId } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // SEO最適化スラッグを生成
    const baseSlug = generateSEOFriendlySlug(title);
    
    // 重複チェックして一意なスラッグを生成
    const uniqueSlug = await generateUniqueSlug(baseSlug, excludeId);
    
    return NextResponse.json({ 
      slug: uniqueSlug,
      isUnique: baseSlug === uniqueSlug 
    });
  } catch (error) {
    console.error('Failed to generate slug:', error);
    return NextResponse.json(
      { error: 'Failed to generate slug' },
      { status: 500 }
    );
  }
}