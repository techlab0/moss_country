import { getBlogPosts, urlFor } from '@/lib/sanity'
import type { BlogPost } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import Link from 'next/link'
import Image from 'next/image'

export default async function BlogPage() {
  const posts: BlogPost[] = await getBlogPosts()

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
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
              ブログ・お知らせ
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              MOSS COUNTRYからの最新情報やテラリウムのお手入れ方法、
              新商品のご紹介などをお届けします。
            </p>
          </div>
        </Container>
      </section>

      <div className="py-8">
        <Container>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">現在記事がありません。</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug.current}`} className="block group">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  {post.featuredImage ? (
                    <div className="h-48 overflow-hidden">
                      <Image
                        src={urlFor(post.featuredImage).width(400).height(300).url()}
                        alt={post.title}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-48">
                      <ImagePlaceholder
                        src=""
                        alt={post.title}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        
                      />
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      {post.category && (
                        <span className="bg-moss-green text-white px-2 py-1 rounded text-sm">
                          {post.category}
                        </span>
                      )}
                      <time className="text-gray-500 text-sm">
                        {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                      </time>
                    </div>
                    
                    <h2 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-moss-green transition-colors">
                      {post.title}
                    </h2>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 line-clamp-3">{post.excerpt}</p>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">著者: {post.author}</span>
                      <span className="text-moss-green text-sm font-medium group-hover:underline">
                        続きを読む →
                      </span>
                    </div>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
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