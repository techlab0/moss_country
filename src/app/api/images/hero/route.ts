import { NextRequest, NextResponse } from 'next/server';
import { getHeroImage } from '@/lib/imageUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') as 'main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact' | null;

    if (!page) {
      return NextResponse.json({ error: 'Page parameter is required' }, { status: 400 });
    }

    const imageInfo = await getHeroImage(page);
    
    return NextResponse.json(imageInfo);
  } catch (error) {
    console.error('Error fetching hero image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hero image' },
      { status: 500 }
    );
  }
}
