import { NextResponse } from 'next/server';
import { getBlogCategoryStats } from '@/lib/sanity';

export async function GET() {
  try {
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