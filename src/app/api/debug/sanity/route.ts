import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function GET() {
  try {
    // 環境変数確認
    const envCheck = {
      hasProjectId: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      hasDataset: !!process.env.NEXT_PUBLIC_SANITY_DATASET,
      hasApiToken: !!process.env.SANITY_API_TOKEN,
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      // APIトークンは最初の数文字のみ表示
      apiTokenPrefix: process.env.SANITY_API_TOKEN?.substring(0, 10) + '...',
    };

    // Sanity接続テスト
    console.log('Testing Sanity connection...');
    const testConnection = await client.fetch('*[0]');
    
    // ブログポスト取得テスト
    console.log('Testing blog posts query...');
    const allPosts = await client.fetch(`*[_type == "blogPost"]`);
    const publishedPosts = await client.fetch(`*[_type == "blogPost" && isPublished == true]`);
    
    return NextResponse.json({
      status: 'success',
      environment: envCheck,
      connection: {
        connected: true,
        testResult: 'Connection successful'
      },
      data: {
        totalPosts: allPosts.length,
        publishedPosts: publishedPosts.length,
        posts: allPosts.map(post => ({
          id: post._id,
          title: post.title,
          slug: post.slug?.current,
          isPublished: post.isPublished,
          publishedAt: post.publishedAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Sanity debug error:', error);
    
    return NextResponse.json({
      status: 'error',
      environment: {
        hasProjectId: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        hasDataset: !!process.env.NEXT_PUBLIC_SANITY_DATASET,
        hasApiToken: !!process.env.SANITY_API_TOKEN,
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      },
      connection: {
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}