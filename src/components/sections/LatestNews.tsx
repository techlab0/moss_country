'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBlogPosts } from '@/lib/sanity';
import type { BlogPost } from '@/types/sanity';
import { Container } from '@/components/layout/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { InlineLoading } from '@/components/ui/LoadingScreen';

export const LatestNews: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <section className="py-16 sm:py-24 bg-stone-900/70 backdrop-blur-md">
        <Container>
          <InlineLoading message="新着情報を読み込み中..." />
        </Container>
      </section>
    );
  }

  if (posts.length === 0) {
    return null; // 記事がない場合は表示しない
  }

  return (
    <section className="py-16 sm:py-24 bg-stone-900/70 backdrop-blur-md">
      <Container>
        <AnimatedSection animation="fade-in" className="text-center mb-12 sm:mb-16">
          <div className="mb-6 sm:mb-8">
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-300 font-medium">
              Latest News
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white mb-8 sm:mb-12 leading-tight">
            <span className="text-emerald-400 font-bold">新着情報</span>
            <br />
            News & Updates
          </h2>
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto"></div>
        </AnimatedSection>

        <div className="max-w-4xl mx-auto space-y-4">
          {posts.map((post, index) => (
            <AnimatedSection 
              key={post._id} 
              animation="slide-up" 
              delay={index * 100}
              className="group"
            >
              <Link 
                href={`/blog/${post.slug.current}`}
                className="block bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6 hover:bg-white/20 transition-all duration-300 border border-white/10 hover:border-emerald-400/50"
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
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection animation="fade-in" delay={600} className="text-center mt-12">
          <Link 
            href="/blog"
            className="inline-flex items-center px-8 py-3 text-emerald-300 border border-emerald-400 rounded-full hover:bg-emerald-400 hover:text-stone-900 transition-all duration-300 font-medium"
          >
            すべての記事を見る
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </AnimatedSection>
      </Container>
    </section>
  );
};