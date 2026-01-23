import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundImage } from '@/lib/imageUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') as 'main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact' | null;
    const isMobile = searchParams.get('mobile') === 'true';

    if (!page) {
      return NextResponse.json({ error: 'Page parameter is required' }, { status: 400 });
    }

    const imageInfo = await getBackgroundImage(page, isMobile);
    
    return NextResponse.json(imageInfo);
  } catch (error) {
    console.error('Error fetching background image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch background image' },
      { status: 500 }
    );
  }
}
