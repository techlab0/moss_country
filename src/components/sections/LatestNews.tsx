'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getBlogPosts } from '@/lib/sanity';
import type { BlogPost } from '@/types/sanity';
import { Container } from '@/components/layout/Container';
import { InlineLoading } from '@/components/ui/LoadingScreen';

export const LatestNews: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  // データ取得ロジック（変更禁止）
  useEffect(() => {
    const fetchLatestPosts = async () => {
      try {
        const latestPosts = await getBlogPosts(5, 0); // 最新5件を取得
        setPosts(latestPosts);
      } catch (error) {
        console.error('新着情報の取得に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestPosts();
  }, []);

  // シーンの入場演出は SceneBackdrop が [data-scene-content] 単位で行う。
  // ここで個別のScrollTrigger演出を持つと、非同期取得したカードが
  // opacity:0 のまま取り残される競合が起きるため、内部演出は持たない。

  if (isLoading) {
    return (
      <section data-home-screen="regular" data-scene-id="news" className="relative py-12 sm:py-16 md:py-24">
        <Container>
          <InlineLoading message="新着情報を読み込み中..." />
        </Container>
      </section>
    );
  }

  // 記事0件でもNewsシーン自体は必ず表示する（フルページ構成でシーンが抜けないように）

  return (
    <section ref={sectionRef} data-home-screen="regular" data-scene-id="news" className="relative py-12 sm:py-16 md:py-24 [@media(max-height:720px)]:py-6">
      <div data-scene-content>
      <Container>
        <div className="text-center mb-8 sm:mb-12 md:mb-16 [@media(max-height:720px)]:mb-4">
          <div className="mb-6 sm:mb-8 [@media(max-height:720px)]:mb-3">
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-300 font-medium">
              Latest News
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white mb-8 sm:mb-12 [@media(max-height:720px)]:mb-4 leading-tight">
            <span className="text-emerald-400 font-bold">新着情報</span>
            <br />
            News & Updates
          </h2>
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto"></div>
        </div>

        {posts.length === 0 && (
          <p className="text-center text-gray-300 text-sm sm:text-base">
            現在お知らせはありません。最新情報は近日公開予定です。
          </p>
        )}

        <div className="max-w-4xl mx-auto space-y-4">
          {posts.map((post) => (
            <div
              key={post._id}
              className="group"
            >
              <Link
                href={`/blog/${post.slug.current}`}
                className="block bg-stone-950/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 hover:bg-stone-900/60 transition-all duration-300 border border-emerald-400/15 hover:border-emerald-400/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                      <time className="text-emerald-300 text-sm font-medium order-2 sm:order-1">
                        {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                      </time>
                      {post.category && (
                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium w-fit order-1 sm:order-2">
                          {post.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white text-lg sm:text-xl font-medium group-hover:text-emerald-300 transition-colors duration-300 line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-300 text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex items-center text-emerald-400 text-sm font-medium group-hover:text-emerald-300 transition-colors duration-300">
                      詳細を見る
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 [@media(max-height:720px)]:mt-5">
          <Link
            href="/blog"
            className="inline-flex items-center px-8 py-3 text-emerald-300 border border-emerald-400 rounded-full hover:bg-emerald-400 hover:text-stone-900 transition-all duration-300 font-medium"
          >
            すべての記事を見る
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </Container>
      </div>
    </section>
  );
};
