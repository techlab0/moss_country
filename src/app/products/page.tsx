'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import { PRODUCT_CATEGORIES, resolveCategory } from '@/lib/productCategories';
import type { Product } from '@/types/sanity';
import { usePageContent } from '@/hooks/usePageContent';
import { compareByReading } from '@/lib/productSort';

const careGuideMeta = [
  { list: ['本が読めるくらいの明るさがあればOK', '強い日差しには弱いので、直射日光は避けてください', '蛍光灯やLEDで生育が可能です'] },
  { list: ['水は葉っぱから吸収するので、苔をしっかり湿らせてください', '土台となる土は常に湿らせるようにしてください', '水は多すぎると苔に悪いので、あげすぎには注意してください'] },
  { list: ['空気がこもっていると苔の徒長の原因にもなるため、できるときは1日に一回数分程度の換気を行いましょう', '換気をすることで湿気のこもりすぎも防止でき、苔も丈夫に育ちやすくなります'] },
  { list: ['苔の色が悪くなった場合などには、薬品を溶かした水を散布します', '季節の変わり目の春や秋は温度変化も大きく、苔への負担も少なからず増している状態ですので、必要であればこの時期に散布をしてみましょう'] },
  { list: ['苔も時間が経つにつれて伸びてくるものもありますので、気になってきたらカットして整えましょう', '色の茶色くなった苔はカットして無くすことでカビの予防にもなります', '適度に容器内の水滴と水垢を拭き取り綺麗に保ちましょう'] },
  { list: ['苔を取り出し傷んでいる部分や茶色くなっている部分は捨てましょう', '新しい容器に土、石、流木などレイアウト物を入れて移し替えることも可能です'] },
];

export default function ProductsPage() {
  // 管理画面の「ページ編集」で保存された文言・画像を反映する（保存がなければ従来の文言・画像）
  const { t, img } = usePageContent('products');
  const terrariumCategories = [1, 2, 3, 4].map(i => ({
    name: t(`terrarium${i}Name`),
    description: t(`terrarium${i}Desc`),
    image: img(`terrarium${i}Image`),
  }));
  const supplyCategories = [1, 2, 3, 4].map(i => ({
    name: t(`supply${i}Name`),
    description: t(`supply${i}Desc`),
    image: img(`supply${i}Image`),
  }));
  const careGuide = careGuideMeta.map((meta, i) => ({
    title: t(`care${i + 1}Title`),
    lead: t(`care${i + 1}Lead`),
    list: meta.list,
  }));
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'name' | 'priceAsc' | 'priceDesc'>('recommended');
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

  // 商品データを取得（API経由で登録直後の商品も即時反映）
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('商品の取得に失敗しました');
        const fetchedProducts = await res.json();
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
    fetch(`/api/images/hero?page=products`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setHeroImageUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load hero image, using default:', error);
        // エラー時はデフォルト画像を維持（既に設定済み）
      });
  }, []);

  // 背景画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    // PC用背景画像
    fetch(`/api/images/background?page=products&mobile=false`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setBackgroundImageUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load background image (PC), using default:', error);
        // エラー時はデフォルト画像を維持（既に設定済み）
      });
    // モバイル用背景画像
    fetch(`/api/images/background?page=products&mobile=true`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setBackgroundImageMobileUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load background image (Mobile), using default:', error);
        // エラー時はデフォルト画像を維持（既に設定済み）
      });
  }, []);

  // 検索・在庫・並び替えをカテゴリ内の商品配列に適用
  const filterAndSortProducts = (list: Product[]): Product[] => {
    let result = list;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    if (inStockOnly) {
      result = result.filter((p) => {
        const stockQuantity = p.stockQuantity ?? undefined;
        if (stockQuantity === undefined) return true; // 未設定は在庫あり扱い
        const availableStock = stockQuantity - (p.reserved || 0);
        return availableStock > 0;
      });
    }

    if (sortBy !== 'recommended') {
      result = [...result].sort((a, b) => {
        if (sortBy === 'name') return compareByReading(a, b);
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'priceDesc') return b.price - a.price;
        return 0;
      });
    }

    return result;
  };

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
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg"
              dangerouslySetInnerHTML={{ __html: t('heroTitle') }}
            />
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow whitespace-pre-line">
              {t('heroLead')}
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
              return (
                <Card key={index} className="text-center glass-card-dark">
                  <CardHeader>
                    <div className="w-full aspect-video rounded-lg overflow-hidden mx-auto mb-4">
                      <img
                        src={category.image}
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
              return (
                <Card key={index} className="text-center glass-card-dark">
                  <CardHeader>
                    <div className="w-full aspect-video rounded-lg overflow-hidden mx-auto mb-4">
                      <img
                        src={category.image}
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

      {/* Product Grid - カテゴリ別セクション */}
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
            <>
              {/* 検索・在庫フィルタ・並び替えツールバー */}
              <div className="bg-stone-950/60 backdrop-blur-md rounded-xl p-4 sm:p-6 mb-12 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="商品名で検索"
                    aria-label="商品名で検索"
                    className="w-full px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-moss-green"
                  />
                </div>
                <label className="flex items-center gap-2 text-white text-sm font-medium whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-moss-green"
                  />
                  在庫ありのみ
                </label>
                <div className="flex items-center gap-2">
                  <label htmlFor="product-sort" className="text-white text-sm font-medium whitespace-nowrap">
                    並び替え
                  </label>
                  <select
                    id="product-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-moss-green"
                  >
                    <option value="recommended">おすすめ順</option>
                    <option value="name">あいうえお順</option>
                    <option value="priceAsc">価格が安い順</option>
                    <option value="priceDesc">価格が高い順</option>
                  </select>
                </div>
              </div>

              {(() => {
                const categorySections = PRODUCT_CATEGORIES.map((category) => {
                  const categoryProducts = products.filter(
                    (p) => resolveCategory(p.category) === category
                  );
                  return { category, filtered: filterAndSortProducts(categoryProducts) };
                }).filter((section) => section.filtered.length > 0);

                if (categorySections.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg">
                        <p className="text-white text-lg">条件に一致する商品が見つかりませんでした</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-16">
                    {categorySections.map(({ category, filtered }) => (
                      <div key={category}>
                        <div className="bg-black/50 backdrop-blur-sm p-6 mb-8">
                          <h3 className="text-2xl md:text-3xl font-bold text-white text-center">
                            {category}
                          </h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {filtered.map((product) => (
                            <ProductCard key={product._id} product={product} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
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
              {careGuide.map((item, index) => (
                <div key={index} className="bg-white/50 p-6 rounded-lg h-full flex flex-col">
                  <h3 className="text-xl font-bold text-moss-green mb-3">{item.title}</h3>
                  <p className="text-gray-900 mb-3 flex-grow">{item.lead}</p>
                  <ul className="text-gray-800 space-y-1 text-sm">
                    {item.list.map((line, i) => (
                      <li key={i}>・{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-moss-green text-white">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('ctaTitle')}
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto whitespace-pre-line">
              {t('ctaLead')}
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