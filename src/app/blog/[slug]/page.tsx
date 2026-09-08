import { getBlogPostBySlug, urlFor } from '@/lib/sanity'
import type { BlogPost } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText } from '@portabletext/react'
import { imageDisplayScale, imageObjectPosition } from '@/lib/imagePosition'

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post: BlogPost | null = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const hasBody = Array.isArray(post.content) && post.content.length > 0

  return (
    <div 
      className="min-h-screen py-8 site-page-tone"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Container>

        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                {post.category && (
                  <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm">
                    {post.category}
                  </span>
                )}
                <time className="text-gray-500">
                  {new Date(post.publishedAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
              
              <h1 className="text-4xl font-bold text-moss-green mb-4">{post.title}</h1>
              
              <div className="flex items-center text-gray-600">
                <span>著者: {post.author}</span>
              </div>
            </div>

            {post.featuredImage && (
              <div className="aspect-video overflow-hidden rounded-lg bg-stone-100 mt-8 mb-8">
                <Image
                  src={urlFor(post.featuredImage).width(1200).url()}
                  alt={post.title}
                  width={800}
                  height={450}
                  className="w-full h-full object-contain"
                  style={{ objectPosition: imageObjectPosition(post.featuredImage), transform: `scale(${imageDisplayScale(post.featuredImage) / 100})`, transformOrigin: imageObjectPosition(post.featuredImage) }}
                />
              </div>
            )}

          </header>

          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 mb-8">
            <div className="prose prose-lg max-w-none">
              {hasBody ? (
                <PortableText
                value={post.content}
                components={{
                  block: {
                    normal: ({ children }) => <p className="mb-4 leading-relaxed text-gray-700">{children}</p>,
                    h1: ({ children }) => <h1 className="text-3xl font-bold text-moss-green mb-6">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-semibold text-moss-green mb-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-semibold text-moss-green mb-3">{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-moss-green pl-4 italic text-gray-600 my-6">
                        {children}
                      </blockquote>
                    ),
                  },
                  types: {
                    // types を定義しないと本文中の画像ブロックは黙って描画されない
                    image: ({ value }) => {
                      let src: string
                      try {
                        // fit('max') は元画像より大きくしない。小さな画像を引き伸ばして
                        // ぼやけさせたり、無駄に大きいファイルを配信したりしないため。
                        src = urlFor(value).width(1200).fit('max').auto('format').url()
                      } catch {
                        return null
                      }
                      return (
                        <img
                          src={src}
                          alt={value?.alt || ''}
                          className="max-w-full h-auto rounded-lg my-6"
                        />
                      )
                    },
                  },
                  marks: {
                    strong: ({ children }) => <strong className="font-semibold text-moss-green">{children}</strong>,
                    // 日本語フォントには斜体の字形が無く、font-style では傾かない。
                    // 実際に傾けるため globals.css の .text-slant（変形による斜体）を使う。
                    em: ({ children }) => <em className="text-slant">{children}</em>,
                    link: ({ children, value }) => (
                      <a href={value.href} className="text-moss-green hover:underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  },
                  list: {
                    bullet: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                    number: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                  },
                  listItem: {
                    bullet: ({ children }) => <li className="text-gray-700">{children}</li>,
                    number: ({ children }) => <li className="text-gray-700">{children}</li>,
                  },
                }}
                />
              ) : post.excerpt ? (
                <p className="mb-4 leading-relaxed whitespace-pre-line text-gray-700">{post.excerpt}</p>
              ) : (
                <p className="text-gray-500">本文は現在準備中です。</p>
              )}
            </div>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">タグ</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ブログ一覧に戻るボタン */}
          <div className="text-center">
            <Link 
              href="/blog" 
              className="inline-flex items-center px-6 py-3 bg-moss-green text-white font-medium rounded-lg hover:bg-moss-green/90 transition-colors shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ブログ一覧に戻る
            </Link>
          </div>
        </article>
      </Container>
    </div>
  )
}
