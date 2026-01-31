import { getProductBySlug } from '@/lib/sanity'
import type { Product } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { ProductActions } from '@/components/ui/ProductActions'
import { getSafeImageUrl, getProductSlug, PRODUCT_IMAGE_FALLBACK_LOGO } from '@/lib/adapters'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface ProductPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  let product: Product | null = null
  try {
    const { slug } = await params
    product = await getProductBySlug(slug)
  } catch {
    notFound()
  }

  if (!product) {
    notFound()
  }

  const price = Number(product?.price) ?? 0
  const name = String(product?.name ?? '')
  const category = String(product?.category ?? '')

  // 画像URLは getSafeImageUrl 内で try/catch しているが、念のためここでも try で囲む
  let mainImageUrl = PRODUCT_IMAGE_FALLBACK_LOGO
  try {
    if (product.images?.[0]) {
      mainImageUrl = getSafeImageUrl(product.images[0], 600, 600)
    }
  } catch {
    mainImageUrl = PRODUCT_IMAGE_FALLBACK_LOGO
  }

  const hasImages = Boolean(
    product.images?.length &&
    product.images[0]?.asset &&
    typeof product.images[0].asset === 'object' &&
    (
      ('url' in product.images[0].asset && (product.images[0].asset as { url?: string }).url) ||
      ('_id' in product.images[0].asset) ||
      ('_ref' in product.images[0].asset && (product.images[0].asset as { _ref?: string })._ref)
    )
  )

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
            {hasImages ? (
              <>
                <div className="aspect-square overflow-hidden rounded-lg bg-white/80 flex items-center justify-center">
                  {/* 通常の img を使用（Next/Image の SSR 最適化で落ちるのを防ぐ） */}
                  <img
                    src={mainImageUrl}
                    alt={name}
                    width={600}
                    height={600}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = PRODUCT_IMAGE_FALLBACK_LOGO;
                    }}
                  />
                </div>
                {(product.images?.length ?? 0) > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {product.images!.slice(1, 5).map((image, index) => {
                      const asset = image?.asset as Record<string, unknown> | undefined;
                      const hasValidAsset = asset && (asset.url || asset._id || asset._ref);
                      let thumbUrl = PRODUCT_IMAGE_FALLBACK_LOGO;
                      try {
                        if (hasValidAsset) thumbUrl = getSafeImageUrl(image, 150, 150);
                      } catch {
                        thumbUrl = PRODUCT_IMAGE_FALLBACK_LOGO;
                      }
                      return hasValidAsset ? (
                        <div key={index} className="aspect-square overflow-hidden rounded bg-white/80 flex items-center justify-center">
                          <img
                            src={thumbUrl}
                            alt={`${name} ${index + 2}`}
                            width={150}
                            height={150}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = PRODUCT_IMAGE_FALLBACK_LOGO;
                            }}
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square rounded-lg bg-white/80 flex items-center justify-center overflow-hidden">
                <img
                  src={PRODUCT_IMAGE_FALLBACK_LOGO}
                  alt={name}
                  width={400}
                  height={400}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm">
                  {category}
                </span>
                {product.featured && (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    おすすめ
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-moss-green mb-4">{name}</h1>
              <div className="text-2xl sm:text-3xl font-bold text-moss-green mb-6">
                ¥{price.toLocaleString()}
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

            {/* 商品アクション（カート追加など）。渡す product はシリアライズ可能な形に正規化 */}
            <ProductActions
              product={{
                ...product,
                name,
                price,
                category,
                slug: typeof product.slug === 'string' ? { current: product.slug, _type: 'slug' } : (product.slug ?? { current: getProductSlug(product), _type: 'slug' }),
              }}
            />
          </div>
        </div>
      </Container>
    </div>
  )
}