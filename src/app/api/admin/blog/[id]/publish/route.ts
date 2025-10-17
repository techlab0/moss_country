import { NextResponse } from 'next/server';
import { publishBlogPost, unpublishBlogPost } from '@/lib/sanity';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { action } = await request.json();
    
    let updatedPost;
    
    if (action === 'publish') {
      updatedPost = await publishBlogPost(id);
    } else if (action === 'unpublish') {
      updatedPost = await unpublishBlogPost(id);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "publish" or "unpublish"' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Failed to update blog post publish status:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post publish status' },
      { status: 500 }
    );
  }
}