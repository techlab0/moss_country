'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { getProducts } from '@/lib/sanity';
import { getHeroImage, getBackgroundImage, defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import type { Product } from '@/types/sanity';

const terrariumCategories = [
  {
    name: 'Mini Terrarium（ミニ・テラリウム）',
    description: '小さなガラスの中に広がる、あなただけの癒しの森。手のひらの中で、穏やかな時間が流れます。',
  },
  {
    name: 'Standard Terrarium（スタンダード・テラリウム）',
    description: '日々の暮らしに寄り添う、やさしい苔の景色。静かな緑が、心に安らぎを届けます。',
  },
  {
    name: 'Grand Terrarium（グランド・テラリウム）',
    description: '存在感ある苔の世界が、空間を豊かに彩ります。深みのある緑が、上質な癒しをもたらします。',
  },
  {
    name: 'Premium Terrarium（プレミアム・テラリウム）',
    description: '時を忘れるほどに美しい、静寂の世界。苔の深みが、空間をやさしく包み込みます。',
  },
];

const supplyCategories = [
  {
    name: 'ツール',
    description: 'テラリウム作りに必要な専門道具',
  },
  {
    name: '容器',
    description: '様々なサイズとデザインのガラス容器',
  },
  {
    name: '素材',
    description: '苔、土、石などの自然素材',
  },
  {
    name: 'フィギュア',
    description: 'テラリウムを彩る小さな装飾品',
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['products'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['products'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['products-mobile'].src);

  // 画面サイズを監視してモバイルかどうかを判定
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 商品データを取得
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const fetchedProducts = await getProducts();
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('商品データの取得に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ヒーロー画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    getHeroImage('products').then((imageInfo) => {
      if (imageInfo?.src) {
        setHeroImageUrl(imageInfo.src);
      }
    }).catch((error) => {
      console.warn('Failed to load hero image, using default:', error);
      // エラー時はデフォルト画像を維持（既に設定済み）
    });
  }, []);

  // 背景画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    // PC用背景画像
    getBackgroundImage('products', false).then((imageInfo) => {
      if (imageInfo?.src) {
        setBackgroundImageUrl(imageInfo.src);
      }
    }).catch((error) => {
      console.warn('Failed to load background image (PC), using default:', error);
      // エラー時はデフォルト画像を維持（既に設定済み）
    });
    // モバイル用背景画像
    getBackgroundImage('products', true).then((imageInfo) => {
      if (imageInfo?.src) {
        setBackgroundImageMobileUrl(imageInfo.src);
      }
    }).catch((error) => {
      console.warn('Failed to load background image (Mobile), using default:', error);
      // エラー時はデフォルト画像を維持（既に設定済み）
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-moss-green bg-white">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-moss-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative bg-fixed-desktop"
      style={{
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Unified Background Overlay */}
      <div className="absolute inset-0 pointer-events-none" />
      
      {/* Hero Section */}
      <section
        className="py-20 relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: `url('${heroImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              MOSS COUNTRYの<br />テラリウムコレクション
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow">
              一つひとつ手作業で丁寧に作られた本格テラリウム。
              初心者向けからプレミアムまで、あなたにぴったりの作品を見つけてください。
            </p>
            <Button variant="primary" size="lg">
              <a href="#products">
                商品を見る
              </a>
            </Button>
          </div>
        </Container>
      </section>

      {/* Terrarium Works Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                テラリウム作品
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {terrariumCategories.map((category, index) => {
              const getImageSrc = () => {
                switch(category.name) {
                  case 'Mini Terrarium（ミニ・テラリウム）':
                    return '/images/products/moss-country_products_bottle.png';
                  case 'Standard Terrarium（スタンダード・テラリウム）':
                    return '/images/products/moss-country_products_glass.png';
                  case 'Grand Terrarium（グランド・テラリウム）':
                    return '/images/products/moss-country_products_mossball.png';
                  case 'Premium Terrarium（プレミアム・テラリウム）':
                    return '/images/products/moss-country_products_big.png';
                  default:
                    return '/images/products/moss-country_products_bottle.png';
                }
              };
              
              return (
                <Card key={index} className="text-center glass-card-dark">
                  <CardHeader>
                    <div className="w-full aspect-video rounded-lg overflow-hidden mx-auto mb-4">
                      <img 
                        src={getImageSrc()} 
                        alt={category.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                    <p className="text-gray-100 font-medium text-base">{category.description}</p>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Supplies Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                関連用品
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supplyCategories.map((category, index) => {
              const getImageSrc = () => {
                switch(category.name) {
                  case 'ツール':
                    return '/images/products/terrarium-starter.jpg';
                  case '容器':
                    return '/images/products/terrarium-standard.jpg';
                  case '素材':
                    return '/images/products/terrarium-premium.jpg';
                  case 'フィギュア':
                    return '/images/products/terrarium-custom.jpg';
                  default:
                    return '/images/products/terrarium-starter.jpg';
                }
              };
              
              return (
                <Card key={index} className="text-center glass-card-dark">
                  <CardHeader>
                    <div className="w-full aspect-video rounded-lg overflow-hidden mx-auto mb-4">
                      <img 
                        src={getImageSrc()} 
                        alt={category.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                    <p className="text-gray-100 font-medium text-base">{category.description}</p>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Product Grid */}
      <section id="products" className="py-20 relative">
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
                <ProductCard key={product._id} product={product} />
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
          <div className="glass-card p-8 rounded-3xl">
            <h2 className="text-3xl font-bold text-moss-green mb-6 text-center">
              苔のお手入れ・管理方法
            </h2>
            <p className="text-lg text-gray-900 mb-8 text-center">
              MOSS COUNTRYのテラリウムは、忙しい方でも簡単にお手入れできるよう設計されています。
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                <h3 className="text-xl font-bold text-moss-green mb-3">置き場所と光</h3>
                <p className="text-gray-900 mb-3 flex-grow">直射日光は避け、ライトの光またはレース越しの光に当てましょう</p>
                <ul className="text-gray-800 space-y-1 text-sm">
                  <li>・本が読めるくらいの明るさがあればOK</li>
                  <li>・強い日差しには弱いので、直射日光は避けてください</li>
                  <li>・蛍光灯やLEDで生育が可能です</li>
                </ul>
              </div>

              <div className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                <h3 className="text-xl font-bold text-moss-green mb-3">水やり</h3>
                <p className="text-gray-900 mb-3 flex-grow">基本用土には、月に一度しっかりと水を与え、普段は週に一度ほど、苔と土の表面を軽く霧吹きで湿らせるだけでOK</p>
                <ul className="text-gray-800 space-y-1 text-sm">
                  <li>・水は葉っぱから吸収するので、苔をしっかり湿らせてください</li>
                  <li>・土台となる土は常に湿らせるようにしてください</li>
                  <li>・水は多すぎると苔に悪いので、あげすぎには注意してください</li>
                </ul>
              </div>

              <div className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                <h3 className="text-xl font-bold text-moss-green mb-3">空気の入れ替え</h3>
                <p className="text-gray-900 mb-3 flex-grow">余裕のある時は換気を行いましょう</p>
                <ul className="text-gray-800 space-y-1 text-sm">
                  <li>・空気がこもっていると苔の徒長の原因にもなるため、できるときは1日に一回数分程度の換気を行いましょう</li>
                  <li>・換気をすることで湿気のこもりすぎも防止でき、苔も丈夫に育ちやすくなります</li>
                </ul>
              </div>

              <div className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                <h3 className="text-xl font-bold text-moss-green mb-3">肥料</h3>
                <p className="text-gray-900 mb-3 flex-grow">基本的には苔に肥料は使いません</p>
                <ul className="text-gray-800 space-y-1 text-sm">
                  <li>・苔の色が悪くなった場合などには、薬品を溶かした水を散布します</li>
                  <li>・季節の変わり目の春や秋は温度変化も大きく、苔への負担も少なからず増している状態ですので、必要であればこの時期に散布をしてみましょう</li>
                </ul>
              </div>

              <div className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                <h3 className="text-xl font-bold text-moss-green mb-3">お手入れ</h3>
                <p className="text-gray-900 mb-3 flex-grow">適度にお手入れして見た目もきれいで清潔に保ちましょう</p>
                <ul className="text-gray-800 space-y-1 text-sm">
                  <li>・苔も時間が経つにつれて伸びてくるものもありますので、気になってきたらカットして整えましょう</li>
                  <li>・色の茶色くなった苔はカットして無くすことでカビの予防にもなります</li>
                  <li>・適度に容器内の水滴と水垢を拭き取り綺麗に保ちましょう</li>
                </ul>
              </div>

              <div className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                <h3 className="text-xl font-bold text-moss-green mb-3">移植</h3>
                <p className="text-gray-900 mb-3 flex-grow">苔は移植先でも成長しやすいため、容器の交換なども行えます</p>
                <ul className="text-gray-800 space-y-1 text-sm">
                  <li>・苔を取り出し傷んでいる部分や茶色くなっている部分は捨てましょう</li>
                  <li>・新しい容器に土、石、流木などレイアウト物を入れて移し替えることも可能です</li>
                </ul>
              </div>
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
                href="/checkout"
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 font-semibold px-8 py-3 rounded-lg inline-block"
              >
                カートを見る
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