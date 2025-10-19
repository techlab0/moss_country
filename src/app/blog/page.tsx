'use client';

import { getBlogPosts, urlFor } from '@/lib/sanity'
import type { BlogPost } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { InlineLoading } from '@/components/ui/LoadingScreen'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // 画面サイズを監視してモバイルかどうかを判定
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // ブログ記事を取得
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const fetchedPosts = await getBlogPosts()
        setPosts(fetchedPosts)
        setFilteredPosts(fetchedPosts)
        
        // カテゴリー一覧を作成
        const uniqueCategories = Array.from(
          new Set(fetchedPosts.map(post => post.category).filter(Boolean))
        )
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('ブログ記事の取得に失敗しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [])

  // 検索・フィルター機能
  useEffect(() => {
    let filtered = posts

    // カテゴリーフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory)
    }

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredPosts(filtered)
  }, [posts, searchTerm, selectedCategory])

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: isMobile 
          ? `url('/images/misc/moss02_sp.png')` 
          : `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Unified Background Overlay */}
      <div className="absolute inset-0 pointer-events-none" />
      
      {/* Hero Section */}
      <section className="py-20 relative">
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-emerald-50/70" />
        <div className="absolute inset-0 bg-emerald-950/10" />
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-moss-green mb-6">
              ブログ・ニュース
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              MOSS COUNTRYからの最新情報、イベント出店のお知らせ、テラリウムのお手入れ方法、
              新商品のご紹介などをお届けします。
            </p>
            
            {/* 検索・フィルター */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                {/* 検索窓 */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="記事を検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-moss-green focus:border-transparent text-gray-700 placeholder-gray-400"
                  />
                </div>
                
                {/* カテゴリーフィルター */}
                <div className="md:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full py-3 px-4 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-moss-green focus:border-transparent text-gray-700"
                  >
                    <option value="all">全てのカテゴリー</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* 検索結果数表示 */}
              <div className="mt-4 text-sm text-gray-800">
                {searchTerm || selectedCategory !== 'all' ? (
                  <span>{filteredPosts.length}件の記事が見つかりました</span>
                ) : (
                  <span>全{posts.length}件の記事</span>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="py-8">
        <Container>

        {isLoading ? (
          <InlineLoading message="記事を読み込み中..." />
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            {searchTerm || selectedCategory !== 'all' ? (
              <div className="space-y-4">
                <p className="text-gray-800 text-lg">検索条件に一致する記事が見つかりませんでした。</p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-moss-green bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  検索条件をリセット
                </button>
              </div>
            ) : (
              <p className="text-gray-800 text-lg">現在記事がありません。</p>
            )}
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {filteredPosts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug.current}`} className="block group">
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden bg-white/80 backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row">
                    {/* 画像部分 */}
                    <div className="md:w-1/3 flex-shrink-0">
                      {post.featuredImage ? (
                        <div className="h-48 md:h-full overflow-hidden">
                          <Image
                            src={urlFor(post.featuredImage).width(400).height(300).url()}
                            alt={post.title}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-48 md:h-full">
                          <ImagePlaceholder
                            src=""
                            alt={post.title}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* コンテンツ部分 */}
                    <div className="md:w-2/3 flex flex-col justify-between p-6">
                      <div className="flex-1">
                        {/* ヘッダー情報 */}
                        <div className="flex items-center justify-between mb-3">
                          {post.category && (
                            <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm font-medium">
                              {post.category}
                            </span>
                          )}
                          <time className="text-gray-700 text-sm font-medium">
                            {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                          </time>
                        </div>
                        
                        {/* タイトル */}
                        <h2 className="text-xl md:text-2xl font-bold mb-3 line-clamp-2 group-hover:text-moss-green transition-colors leading-tight">
                          {post.title}
                        </h2>
                        
                        {/* 抜粋 */}
                        {post.excerpt && (
                          <p className="text-gray-700 line-clamp-3 mb-4 leading-relaxed">{post.excerpt}</p>
                        )}
                        
                        {/* タグ */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* フッター */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-700">著者: {post.author}</span>
                        <span className="text-moss-green text-sm font-semibold group-hover:underline flex items-center">
                          続きを読む
                          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        </Container>
      </div>
    </div>
  )
}