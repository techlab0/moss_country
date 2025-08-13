import { getProductBySlug, urlFor } from '@/lib/sanity'
import type { Product } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { ProductActions } from '@/components/ui/ProductActions'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface ProductPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product: Product | null = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <div 
      className="min-h-screen py-8 bg-fixed-desktop"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <Container>
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 inline-block">
            <Link href="/products" className="text-moss-green hover:underline font-medium">
              ← 商品一覧に戻る
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
          <div className="space-y-4">
            {product.images && product.images.length > 0 ? (
              <>
                <div className="aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={urlFor(product.images[0]).width(600).height(600).url()}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.images.length > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {product.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square overflow-hidden rounded">
                        <Image
                          src={urlFor(image).width(150).height(150).url()}
                          alt={`${product.name} ${index + 2}`}
                          width={150}
                          height={150}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square">
                <ImagePlaceholder
                  src=""
                  alt={product.name}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm">
                  {product.category}
                </span>
                {product.featured && (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    おすすめ
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-moss-green mb-4">{product.name}</h1>
              <div className="text-2xl sm:text-3xl font-bold text-moss-green mb-6">
                ¥{product.price.toLocaleString()}
              </div>
            </div>

            {product.description && (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3">商品説明</h2>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.dimensions && (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3">サイズ</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {product.dimensions.width && (
                    <div>
                      <span className="text-gray-600">幅:</span>
                      <span className="ml-1 font-medium">{product.dimensions.width}cm</span>
                    </div>
                  )}
                  {product.dimensions.height && (
                    <div>
                      <span className="text-gray-600">高さ:</span>
                      <span className="ml-1 font-medium">{product.dimensions.height}cm</span>
                    </div>
                  )}
                  {product.dimensions.depth && (
                    <div>
                      <span className="text-gray-600">奥行:</span>
                      <span className="ml-1 font-medium">{product.dimensions.depth}cm</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.materials && product.materials.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3">素材</h2>
                <div className="flex flex-wrap gap-2">
                  {product.materials.map((material, index) => (
                    <span key={index} className="bg-light-green text-moss-green px-3 py-1 rounded-full text-sm">
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.careInstructions && (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3">お手入れ方法</h2>
                <p className="text-gray-700 leading-relaxed">{product.careInstructions}</p>
              </div>
            )}

            {/* 商品アクション（カート追加など） */}
            <ProductActions product={product} />
          </div>
        </div>
      </Container>
    </div>
  )
}