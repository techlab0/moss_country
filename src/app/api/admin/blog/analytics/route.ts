import { NextResponse } from 'next/server';
import { getAllBlogPosts } from '@/lib/sanity';
import type { BlogPost } from '@/types/sanity';

export async function GET() {
  try {
    const posts: BlogPost[] = await getAllBlogPosts();

    // 基本統計を計算
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(post => post.isPublished).length;
    const draftPosts = totalPosts - publishedPosts;

    // カテゴリ別統計
    const categoryCountMap = new Map<string, number>();
    posts.forEach(post => {
      const category = post.category || 'other';
      categoryCountMap.set(category, (categoryCountMap.get(category) || 0) + 1);
    });

    const categoryStats = Array.from(categoryCountMap.entries()).map(([category, count]) => ({
      category,
      count,
      label: getCategoryLabel(category)
    })).sort((a, b) => b.count - a.count);

    // タグ統計
    const tagCountMap = new Map<string, number>();
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
        });
      }
    });

    const tagsStats = Array.from(tagCountMap.entries()).map(([tag, count]) => ({
      tag,
      count
    })).sort((a, b) => b.count - a.count);

    // 最近の記事（更新日順）
    const recentPosts = posts
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 10);

    const stats = {
      totalPosts,
      publishedPosts,
      draftPosts,
      categoryStats,
      tagsStats,
      recentPosts
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch blog analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'news':
      return 'お知らせ';
    case 'howto':
      return 'テラリウムの作り方';
    case 'plants':
      return '植物について';
    case 'maintenance':
      return 'メンテナンス';
    case 'events':
      return 'イベント';
    case 'other':
      return 'その他';
    default:
      return '未分類';
  }
}