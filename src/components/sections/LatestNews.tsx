'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getBlogPosts } from '@/lib/sanity';
import type { BlogPost } from '@/types/sanity';
import { Container } from '@/components/layout/Container';
import { InlineLoading } from '@/components/ui/LoadingScreen';

export const LatestNews: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  // 演出: 見出しが横線とともに引かれ、カードが1枚ずつ左からスライド＋フェードで現れる
  useEffect(() => {
    if (isLoading || posts.length === 0) return;
    const section = sectionRef.current;
    const heading = headingRef.current;
    const rule = ruleRef.current;
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        if (heading) gsap.set(heading, { opacity: 1, y: 0 });
        if (rule) gsap.set(rule, { scaleX: 1 });
        gsap.set(cards, { opacity: 1, x: 0 });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          once: true,
        },
      });

      if (heading) {
        gsap.set(heading, { opacity: 0, y: 16 });
        tl.to(heading, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0);
      }
      if (rule) {
        gsap.set(rule, { scaleX: 0, transformOrigin: '50% 50%' });
        tl.to(rule, { scaleX: 1, duration: 0.9, ease: 'power2.out' }, 0.1);
      }
      if (cards.length > 0) {
        gsap.set(cards, { opacity: 0, x: -48 });
        tl.to(cards, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out', stagger: 0.15 }, 0.2);
      }
    }, section);

    return () => ctx.revert();
  }, [isLoading, posts.length]);

  if (isLoading) {
    return (
      <section data-home-screen="regular" className="relative py-12 sm:py-16 md:py-24">
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
    <section ref={sectionRef} data-home-screen="regular" className="relative py-12 sm:py-16 md:py-24">
      <Container>
        <div ref={headingRef} className="text-center mb-8 sm:mb-12 md:mb-16">
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
          <div ref={ruleRef} className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto"></div>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {posts.map((post, index) => (
            <div
              key={post._id}
              ref={(el) => { cardRefs.current[index] = el; }}
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

        <div className="text-center mt-12">
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
    </section>
  );
};
