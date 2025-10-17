import { NextResponse } from 'next/server';
import { checkSlugExists } from '@/lib/sanity';

export async function POST(request: Request) {
  try {
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