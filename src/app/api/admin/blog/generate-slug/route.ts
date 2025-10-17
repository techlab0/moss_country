import { NextResponse } from 'next/server';
import { generateSEOFriendlySlug } from '@/lib/slugUtils';
import { generateUniqueSlug } from '@/lib/sanity';

export async function POST(request: Request) {
  try {
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