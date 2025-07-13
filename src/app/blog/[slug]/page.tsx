import { getBlogPostBySlug, urlFor } from '@/lib/sanity'
import type { BlogPost } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
<<<<<<< HEAD
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
=======
>>>>>>> clean-main
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText } from '@portabletext/react'

interface BlogPostPageProps {
<<<<<<< HEAD
  params: {
    slug: string
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post: BlogPost | null = await getBlogPostBySlug(params.slug)
=======
  params: Promise<{
    slug: string
  }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post: BlogPost | null = await getBlogPostBySlug(slug)
>>>>>>> clean-main

  if (!post) {
    notFound()
  }

  return (
    <div 
      className="min-h-screen py-8"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Container>
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 inline-block">
            <Link href="/blog" className="text-moss-green hover:underline font-medium">
              ← ブログ一覧に戻る
            </Link>
          </div>
        </div>

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
              <div className="aspect-video overflow-hidden rounded-lg mt-8 mb-8">
                <Image
                  src={urlFor(post.featuredImage).width(800).height(450).url()}
                  alt={post.title}
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

          </header>

          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 mb-8">
            <div className="prose prose-lg max-w-none">
              {post.content && (
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
                  marks: {
                    strong: ({ children }) => <strong className="font-semibold text-moss-green">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
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
              )}
            </div>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">タグ</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </Container>
    </div>
  )
}