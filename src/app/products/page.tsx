import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { getProducts } from '@/lib/sanity';
import type { Product } from '@/types/sanity';

const categories = [
  {
    name: '小瓶入り苔テラリウム',
    description: '手のひらサイズの可愛らしいテラリウム',
  },
  {
    name: 'グラス入り苔テラリウム',
    description: '透明感が美しい上質なガラス容器',
  },
  {
    name: '苔玉',
    description: '日本の伝統美を現代に活かした作品',
  },
  {
    name: '大型苔テラリウム',
    description: 'インパクトある存在感の特別な空間',
  },
];

export default async function ProductsPage() {
  const products: Product[] = await getProducts();

  return (
    <div 
      className="min-h-screen relative bg-fixed-desktop"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-moss-green mb-6">
              <span className="text-emerald-600">MOSS COUNTRY</span>の<br />テラリウムコレクション
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              一つひとつ手作業で丁寧に作られた本格テラリウム。
              初心者向けからプレミアムまで、あなたにぴったりの小さな自然を見つけてください。
            </p>
            <Button variant="primary" size="lg">
              <a href="#products">
                商品を見る
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
                商品例
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const getImageSrc = () => {
                switch(category.name) {
                  case '小瓶入り苔テラリウム':
                    return '/images/products/moss-country_products_bottle.png';
                  case 'グラス入り苔テラリウム':
                    return '/images/products/moss-country_products_glass.png';
                  case '苔玉':
                    return '/images/products/moss-country_products_mossball.png';
                  case '大型苔テラリウム':
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
                        className="w-full h-full object-contain"
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
                <p className="text-gray-900 mb-3 flex-grow">基本的には2～3週間に一度、苔と土を湿らせる程度でOK</p>
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