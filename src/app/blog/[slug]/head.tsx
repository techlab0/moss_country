import { getBlogPostBySlug } from '@/lib/sanity'
import { generateSEOMetadata } from '@/lib/slugUtils'

interface HeadProps {
  params: {
    slug: string
  }
}

export default async function Head({ params }: HeadProps) {
  const post = await getBlogPostBySlug(params.slug)
  
  if (!post) {
    return (
      <>
        <title>記事が見つかりません | MOSS COUNTRY</title>
        <meta name="robots" content="noindex" />
      </>
    )
  }

  const seoData = generateSEOMetadata(post.title, post.excerpt || '', post.category)
  
  return (
    <>
      <title>{seoData.title} | MOSS COUNTRY</title>
      <meta name="description" content={seoData.description} />
      <meta name="keywords" content={seoData.keywords} />
      <meta property="og:title" content={seoData.title} />
      <meta property="og:description" content={seoData.description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://mosscountry.jp/blog/${params.slug}`} />
      {post.featuredImage && (
        <meta property="og:image" content={post.featuredImage.asset?.url} />
      )}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoData.title} />
      <meta name="twitter:description" content={seoData.description} />
      <meta property="article:published_time" content={post.publishedAt} />
      <meta property="article:author" content={post.author} />
      {post.tags?.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      <link rel="canonical" href={`https://mosscountry.jp/blog/${params.slug}`} />
    </>
  )
}