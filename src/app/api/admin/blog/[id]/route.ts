import { NextResponse } from 'next/server';
import { updateBlogPost, deleteBlogPost } from '@/lib/sanity';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    
    console.log('Updating blog post:', id, data);
    
    const updatedPost = await updateBlogPost(id, data);
    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Failed to update blog post:', error);
    console.error('Error details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await deleteBlogPost(id);
    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Failed to delete blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}