import { NextResponse } from 'next/server';
import { getAllBlogPosts, createBlogPost } from '@/lib/sanity';
import { generateSEOFriendlySlug } from '@/lib/slugUtils';

export async function GET() {
  try {
    const posts = await getAllBlogPosts();
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // バリデーション
    if (!data.title || !data.excerpt) {
      return NextResponse.json(
        { error: 'Title and excerpt are required' },
        { status: 400 }
      );
    }

    // スラッグの処理（既に提供されている場合はそれを使用）
    let slug;
    if (data.slug && typeof data.slug === 'object' && data.slug.current) {
      slug = data.slug;
    } else if (data.slug && typeof data.slug === 'string') {
      slug = {
        _type: 'slug',
        current: data.slug
      };
    } else {
      // フォールバック：タイトルから自動生成
      slug = {
        _type: 'slug',
        current: generateSEOFriendlySlug(data.title)
      };
    }

    const blogPost = await createBlogPost({
      ...data,
      slug
    });

    return NextResponse.json(blogPost, { status: 201 });
  } catch (error) {
    console.error('Failed to create blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}