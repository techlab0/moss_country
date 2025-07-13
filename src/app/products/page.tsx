import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { getProducts, urlFor } from '@/lib/sanity';
import type { Product } from '@/types/sanity';
import Link from 'next/link';
import Image from 'next/image';

const categories = [
  {
    name: '初心者向け',
    description: 'テラリウムが初めての方にも安心',
    count: '12種類',
  },
  {
    name: 'プレミアム',
    description: '特別な日にふさわしい高級品',
    count: '8種類',
  },
  {
    name: 'カスタム',
    description: 'あなただけの特別なテラリウム',
    count: '無限∞',
  },
  {
    name: 'ギフト',
    description: '大切な人への贈り物に',
    count: '6種類',
  },
];

export default async function ProductsPage() {
  const products: Product[] = await getProducts();

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
              職人が手がける、世界に一つだけのテラリウム
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              一つひとつ手作業で丁寧に作られた本格テラリウム。
              初心者向けからプレミアムまで、あなたにぴったりの小さな自然を見つけてください。
            </p>
            <Button variant="primary" size="lg">
              <a href="https://mosscountry.theshop.jp/" target="_blank" rel="noopener noreferrer">
                ECサイトで購入する
              </a>
            </Button>
          </div>
        </Container>
      </section>

      {/* Category Overview */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                商品カテゴリー
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Card key={index} className="text-center glass-card-dark">
                <CardHeader>
                  <div className="w-16 h-16 bg-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    {category.name === '初心者向け' && (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                    {category.name === 'プレミアム' && (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                    {category.name === 'カスタム' && (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    {category.name === 'ギフト' && (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                  <p className="text-gray-100 font-medium text-base">{category.description}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-100 font-bold text-lg">{category.count}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Product Grid */}
      <section className="py-20 relative">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                商品ラインナップ
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                すべての商品は職人が一つひとつ手作りで制作しています
              </p>
            </div>
          </div>
          
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg">
                <p className="text-white text-lg">現在商品がありません。</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <Card key={product._id} className="hover:transform hover:scale-105 transition-all duration-300">
                  <div className="h-64 overflow-hidden relative">
                    {product.images && product.images[0] ? (
                      <Image
                        src={urlFor(product.images[0]).width(400).height(300).url()}
                        alt={product.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlaceholder
                        src=""
                        alt={product.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover"
                        fallbackGradient="from-moss-green to-warm-brown"
                      />
                    )}
                    {product.featured && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm z-10">
                        おすすめ
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm">
                        {product.category}
                      </span>
                      <span className="text-moss-green font-bold text-lg">¥{product.price.toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-moss-green mb-2">{product.name}</h3>
                    <p className="text-gray-700 mb-4">{product.description}</p>
                    {product.materials && product.materials.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.materials.map((material, index) => (
                          <span key={index} className="bg-light-green text-moss-green px-2 py-1 rounded text-sm">
                            {material}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Link href={`/products/${product.slug.current}`} className="block">
                        <Button variant="primary" className="w-full">
                          詳細を見る
                        </Button>
                      </Link>
                      <Button variant="secondary" className="w-full">
                        <a href="https://mosscountry.theshop.jp/" target="_blank" rel="noopener noreferrer">
                          ECサイトで購入
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Care Guide */}
      <section className="py-20 relative">
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        <Container className="relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="glass-card p-8 rounded-3xl">
              <h2 className="text-3xl font-bold text-moss-green mb-6">
                簡単お手入れガイド
              </h2>
              <p className="text-lg text-gray-900 mb-6">
                MOSS COUNTRYのテラリウムは、忙しい方でも簡単にお手入れできるよう設計されています。
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-moss-green mb-1">適度な光</h4>
                    <p className="text-gray-900">直射日光を避け、明るい室内に置いてください</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-moss-green mb-1">霧吹きで水分補給</h4>
                    <p className="text-gray-900">週に1-2回、霧吹きで軽く湿らせてください</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-moss-green mb-1">換気を心がける</h4>
                    <p className="text-gray-900">時々蓋を開けて新鮮な空気を入れてください</p>
                  </div>
                </li>
              </ul>
              <div className="mt-8">
                <Button variant="primary">
                  詳しいお手入れガイドを見る
                </Button>
              </div>
            </div>
            <div className="h-96 overflow-hidden rounded-lg">
              <ImagePlaceholder
                src="/images/products/care-guide.jpg"
                alt="テラリウムのお手入れガイド - 霧吹きと手入れ道具"
                width={800}
                height={600}
                className="w-full h-full object-cover"
                fallbackGradient="from-moss-green to-warm-brown"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-moss-green text-white">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              あなたにぴったりのテラリウムを見つけませんか？
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              どの商品があなたに合うかわからない場合は、お気軽にお問い合わせください。
              専門スタッフがあなたのライフスタイルに合った最適なテラリウムをご提案します。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="https://mosscountry.theshop.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 font-semibold px-8 py-3 rounded-lg inline-block"
              >
                ECサイトで購入
              </a>
              <a
                href="mailto:info@mosscountry.jp"
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 font-semibold px-8 py-3 rounded-lg inline-block"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}