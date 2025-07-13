import React from 'react';
import { Hero } from '@/components/sections/Hero';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { CircularCarousel } from '@/components/ui/CircularCarousel';

export default function Home() {
  return (
    <div 
      className="relative"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Unified Background Overlay */}
      <div className="absolute inset-0 bg-emerald-900/20" />
      {/* Hero Section */}
      <Hero />

      {/* MOSS COUNTRYとは */}
      <section className="py-16 sm:py-24 md:py-32 bg-stone-950/90 backdrop-blur-md shadow-2xl">
        <Container>
          <AnimatedSection animation="fade-in" className="text-center mb-16 sm:mb-20 md:mb-24">
            <AnimatedSection animation="slide-up" delay={200} className="mb-6 sm:mb-8">
              <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-400 font-normal">About MOSS COUNTRY</span>
            </AnimatedSection>
            <AnimatedSection animation="slide-up" delay={400} className="mb-6 sm:mb-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal text-white leading-tight sm:leading-relaxed px-4">
                小さな自然、
                <br className="sm:hidden" />
                大きな癒し
              </h2>
            </AnimatedSection>
            <AnimatedSection animation="scale-in" delay={600} className="mb-8 sm:mb-12">
              <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto"></div>
            </AnimatedSection>
            <AnimatedSection animation="fade-in" delay={800}>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-normal text-white max-w-4xl mx-auto leading-relaxed px-4">
                北海道初のカプセルテラリウム専門店として、
                <br className="hidden sm:block" />
                一つひとつ手作業で作り上げる
                <br className="sm:hidden" />
                本格的なテラリウムをお届けします。
              </p>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed mt-6 sm:mt-8 font-normal px-4">
                忙しい日常の中で、ふと目に入る小さな緑の世界が、
                <br className="sm:hidden" />
                あなたの心に安らぎをもたらします。
              </p>
            </AnimatedSection>
          </AnimatedSection>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 px-4">
            <AnimatedSection animation="slide-up" delay={1000} className="text-center group">
              <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:bg-transparent sm:backdrop-blur-0 sm:p-0">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-white mb-3 group-hover:text-emerald-200 transition-colors duration-300">職人の技</h3>
                <div className="w-12 sm:w-16 h-0.5 bg-emerald-400 mx-auto mb-4 group-hover:w-16 sm:group-hover:w-20 transition-all duration-300"></div>
                <p className="text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed font-normal">一つひとつ手作業で丁寧に作られた本物のテラリウム</p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="slide-up" delay={1200} className="text-center group">
              <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:bg-transparent sm:backdrop-blur-0 sm:p-0">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-white mb-3 group-hover:text-emerald-200 transition-colors duration-300">北海道初</h3>
                <div className="w-12 sm:w-16 h-0.5 bg-emerald-400 mx-auto mb-4 group-hover:w-16 sm:group-hover:w-20 transition-all duration-300"></div>
                <p className="text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed font-normal">カプセルテラリウムの専門店として地域密着</p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="slide-up" delay={1400} className="text-center group">
              <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:bg-transparent sm:backdrop-blur-0 sm:p-0">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-white mb-3 group-hover:text-emerald-200 transition-colors duration-300">学べる</h3>
                <div className="w-12 sm:w-16 h-0.5 bg-emerald-400 mx-auto mb-4 group-hover:w-16 sm:group-hover:w-20 transition-all duration-300"></div>
                <p className="text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed font-normal">初心者から上級者まで楽しめるワークショップ</p>
              </div>
            </AnimatedSection>
          </div>
          
          <AnimatedSection animation="fade-in" delay={1600} className="text-center mt-20">
            <a href="/story">
              <Button 
                variant="primary" 
                size="lg"
                className="px-12 py-4 text-lg font-light bg-emerald-600 hover:bg-emerald-700 border-0 rounded-full transition-all duration-300 transform hover:scale-105"
              >
                ストーリーを読む
              </Button>
            </a>
          </AnimatedSection>
        </Container>
      </section>

      {/* 商品カテゴリー概要 - 円形カルーセル */}
      <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-emerald-50/80" />
        {/* Text Visibility Overlay */}
        <div className="absolute inset-0 bg-emerald-950/15" />
        
        <Container className="relative z-10">
          <AnimatedSection animation="fade-in" className="text-center mb-12 sm:mb-16 px-4">
            <div className="mb-6 sm:mb-8">
              <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-amber-900 font-medium">Our Products</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light text-stone-900 mb-8 sm:mb-12 leading-tight">
              あなたにぴったりの
              <br className="sm:hidden" />
              <span className="text-amber-800 font-bold">テラリウムを見つけよう</span>
            </h2>
            <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-amber-700 to-transparent mx-auto"></div>
          </AnimatedSection>
          
          <CircularCarousel 
            items={[
              {
                id: '1',
                title: '初心者向けテラリウム',
                description: 'テラリウム初心者の方でも安心して始められる、お手入れ簡単なシリーズです。',
                image: '/images/products/terrarium-starter.jpg',
                category: 'Beginner',
                price: '¥3,500〜'
              },
              {
                id: '2',
                title: 'プレミアムテラリウム',
                description: '厳選された素材と高度な技術で作られた、特別な日にふさわしいテラリウムです。',
                image: '/images/products/terrarium-premium.jpg',
                category: 'Premium',
                price: '¥12,000〜'
              },
              {
                id: '3',
                title: 'ワークショップ体験',
                description: 'プロの指導のもと、自分だけのオリジナルテラリウムを作る体験ができます。',
                image: '/images/workshop/basic-course.jpg',
                category: 'Workshop',
                price: '¥8,000〜'
              },
              {
                id: '4',
                title: 'カスタムオーダー',
                description: 'お客様のご要望に合わせて、完全オリジナルのテラリウムを制作いたします。',
                image: '/images/products/terrarium-custom.jpg',
                category: 'Custom',
                price: '¥20,000〜'
              },
              {
                id: '5',
                title: 'ギフトセット',
                description: '大切な方への贈り物として、特別にパッケージされたテラリウムセットです。',
                image: '/images/products/terrarium-gift.jpg',
                category: 'Gift',
                price: '¥6,000〜'
              }
            ]}
          />
        </Container>
      </section>

      {/* ワークショップ案内 */}
      <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
        {/* Section Overlay */}
        <div className="absolute inset-0" />
        <Container className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
            <div className="glass-card-dark rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden bg-emerald-900/90 backdrop-blur-md order-2 md:order-1">
              <div className="mb-4 sm:mb-6 relative z-10">
                <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-300 font-medium">Workshop Experience</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-white mb-4 sm:mb-6 leading-tight sm:leading-normal relative z-10">
                自分の手で作る
                <br />
                <span className="text-emerald-300 font-bold">特別なテラリウム体験</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-4 sm:mb-6 leading-relaxed font-light relative z-10">
                経験豊富な職人が丁寧に指導する、本格的なテラリウム制作体験。
                <br className="hidden sm:block" />
                初心者の方でも安心して参加できるよう、基礎から応用まで幅広いコースをご用意しています。
              </p>
              <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 relative z-10">
                <li className="flex items-center text-gray-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-400 mr-3 sm:mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm sm:text-base">初心者から上級者まで対応</span>
                </li>
                <li className="flex items-center text-gray-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-400 mr-3 sm:mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm sm:text-base">必要な材料・道具はすべて込み</span>
                </li>
                <li className="flex items-center text-gray-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-400 mr-3 sm:mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm sm:text-base">作品はそのままお持ち帰り</span>
                </li>
                <li className="flex items-center text-gray-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-400 mr-3 sm:mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm sm:text-base">アフターフォロー完備</span>
                </li>
              </ul>
              <a href="/workshop">
                <Button 
                  variant="primary" 
                  size="lg"
                  className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-light bg-emerald-600 hover:bg-emerald-700 border-0 rounded-full transition-all duration-300 transform hover:scale-105 relative z-10 w-full sm:w-auto"
                >
                  ワークショップ詳細
                </Button>
              </a>
            </div>
            <div className="glass-card-dark rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 h-64 sm:h-80 md:h-96 relative overflow-hidden order-1 md:order-2">
              <ImagePlaceholder
                src="/images/misc/moss03.jpeg"
                alt="テラリウム制作の様子 - 職人による丁寧な指導"
                width={800}
                height={600}
                className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                fallbackGradient="from-moss-green to-warm-brown"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ECサイト誘導CTA */}
      <section className="py-16 sm:py-24 md:py-32 text-white relative overflow-hidden">
        <Container className="relative z-10">
          <div className="text-center glass-card-dark rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 mx-4">
            <div className="mb-6 sm:mb-8">
              <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-200 font-medium">Get Started Today</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 sm:mb-8 leading-tight text-white">
              今すぐテラリウムを
              <br className="sm:hidden" />
              始めませんか？
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-8 sm:mb-10 md:mb-12 text-emerald-100 max-w-3xl mx-auto leading-relaxed font-light">
              オンラインストアでは、厳選されたテラリウムを豊富に取り揃えています。
              <br className="hidden sm:block" />
              全国配送対応で、あなたのもとへ小さな自然をお届けします。
            </p>
            <div className="flex flex-col gap-4 sm:gap-6 justify-center items-center sm:flex-row">
              <a href="https://mosscountry.theshop.jp/" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium bg-white text-emerald-900 hover:bg-emerald-50 border-0 rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  ECサイトで商品を見る
                </Button>
              </a>
              <a href="/store" className="w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium text-white border-2 border-white/60 hover:bg-white hover:text-emerald-900 rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  店舗を訪れる
                </Button>
              </a>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}