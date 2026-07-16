'use client';
import React, { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';

const timelineMeta = [
  { year: '1990-2000s', titleEn: 'Meeting Nature', descriptionEn: 'From childhood, I loved nature and animals. Among them, moss fascinated me - a quiet, living beauty that made time stand still.' },
  { year: '2024', titleEn: 'Rediscovering Moss & Terrariums', descriptionEn: 'When I dreamed of creating my own work, moss came to mind. I wanted to share its quiet beauty and bring healing to people. Since Hokkaido had few moss terrarium spaces, I decided to create one myself.' },
  { year: '2025', titleEn: 'The Birth of Moss Country', descriptionEn: 'Without any precedents, I studied on my own, renovated an old space by hand, and opened Moss Country - Hokkaido\'s first moss terrarium specialty Shop. The name reflects my wish to make Japan a true Moss Country.' },
  { year: '2026', titleEn: 'Looking Ahead', descriptionEn: 'Through moss rental and therapy, I hope to create spaces that soothe the heart. I wish to share the beauty of nature with children and communities across Japan.' },
];

export default function StoryPage() {
  // 管理画面の「ページ編集」で保存された文言・画像を反映する（保存がなければ従来の文言）
  const { t, img } = usePageContent('story');
  const timeline = timelineMeta.map((meta, i) => ({
    ...meta,
    title: t(`timeline${i + 1}Title`),
    description: t(`timeline${i + 1}Desc`),
  }));
  const values = [1, 2, 3, 4].map(i => ({
    title: t(`value${i}Title`),
    description: t(`value${i}Desc`),
  }));
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['story'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['story'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['story-mobile'].src);

  // 画面サイズを監視してモバイルかどうかを判定
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ヒーロー画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    fetch(`/api/images/hero?page=story`)
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
    fetch(`/api/images/background?page=story&mobile=false`)
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
    fetch(`/api/images/background?page=story&mobile=true`)
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

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Unified Background Overlay */}
      <div className="absolute inset-0 pointer-events-none" />
      {/* Hero Section */}
      <section
        className="py-20 relative min-h-screen flex items-center"
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-6 drop-shadow-2xl px-4">
              {t('heroTitle')}
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-xl text-white max-w-3xl mx-auto drop-shadow-lg whitespace-pre-line">
              {t('heroLead')}
            </p>
          </div>
        </Container>
      </section>

      {/* Mission Statement */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6">
                OUR MISSION
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="glass-card-dark text-center p-8 rounded-3xl">
              <blockquote className="text-2xl md:text-3xl text-white font-light leading-relaxed mb-8 whitespace-pre-line">
                「{t('missionQuote')}」
              </blockquote>
              <p className="text-lg text-white/90 font-light whitespace-pre-line">
                {t('missionSub')}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Brand Values */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6">
                OUR VALUES
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-white/90 max-w-2xl mx-auto font-light">
                MOSS COUNTRYが大切にする、4つの価値観
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="relative glass-card-dark rounded-2xl p-8 text-center">
                {/* Ordinal Number */}
                <div className="absolute -top-2 left-1 transform -rotate-12 z-10">
                  <div className="bg-white text-moss-green font-bold text-lg px-4 py-2 rounded-md shadow-xl">
                    {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : '4th'}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4 tracking-wider mt-6 break-words">{value.title}</h3>
                <p className="text-white/90 leading-relaxed font-light">{value.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6">
                OUR JOURNEY
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-white/90 font-light">
                一つの出会いから生まれた、Moss Countryの物語<br/>
                A story born from a single encounter with nature.
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div key={index} className="glass-card-dark rounded-2xl p-6">
                  <div className="flex items-center mb-4">
                    <span className="bg-white text-moss-green px-4 py-2 rounded-lg text-sm font-bold mr-4 shadow-md">
                      {item.year}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-wide">{item.title}</h3>
                      {item.titleEn && (
                        <p className="text-light-green text-sm font-light italic">{item.titleEn}</p>
                      )}
                    </div>
                  </div>
                  <p 
                    className="text-white/90 leading-relaxed font-light mb-3"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                  {item.descriptionEn && (
                    <p 
                      className="text-white/70 leading-relaxed font-light text-sm italic"
                      dangerouslySetInnerHTML={{ __html: item.descriptionEn }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>


      {/* Craftsmanship */}
      <section className="py-20">
        <Container>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="glass-card-dark p-8 rounded-3xl">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6 break-words">
                CRAFTSMANSHIP
              </h2>
              <p className="text-lg text-white/90 mb-6 leading-relaxed font-light whitespace-pre-line">
                {t('craftsmanshipLead')}
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-light-green mb-2 tracking-wide text-sm sm:text-base break-words">MATERIAL SELECTION</h4>
                    <p className="text-white/80 font-light">
                      国内から状態の良い苔を取り寄せ環境に合わせて最適な種類を選びます。<br/>
                      苔の特徴を活かし、長く楽しめる作品づくりを心がけています。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-light-green mb-2 tracking-wide text-sm sm:text-base break-words">ORIGINAL TECHNIQUE</h4>
                    <p className="text-white/80 font-light">
                      独自のレイアウトと育成方法で、苔の自然な表情を引き出します。<br/>
                      見た人が癒されるような、やさしい空間づくりを目指しています。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-light-green mb-2 tracking-wide text-sm sm:text-base break-words">QUALITY ASSURANCE</h4>
                    <p className="text-white/80 font-light">
                      完成後のケア方法を丁寧にお伝えし、長く苔を楽しんでいただけるようサポートいたします。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => window.location.href = '/shop'}
                  className="cursor-pointer"
                >
                  作品を見る
                </Button>
              </div>
            </div>
            
            <div className="h-full">
              <div className="overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl relative h-full">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-light-green/20 via-transparent to-moss-green/20 rounded-2xl"></div>
                <div className="absolute inset-0 shadow-[0_0_50px_rgba(138,195,157,0.3)] rounded-2xl"></div>
                <ImagePlaceholder
                  src={img('craftsmanshipImage')}
                  alt="立桶賢による職人技術と北海道の苔テラリウム制作"
                  width={600}
                  height={500}
                  className="w-full h-full object-cover relative z-10"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Future Vision */}
      <section className="py-20 relative">
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        <Container className="relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-moss-green mb-6">
              FUTURE VISION
            </h2>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-moss-green mb-4 tracking-wide">
                {t('futureVisionTitle')}
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed font-light whitespace-pre-line">
                {t('futureVisionLead')}
              </p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  北海道各地でのワークショップ・体験教室の展開
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  地域や観光との連携を通じた、苔の魅力発信
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  採取に頼らず、育成・循環を重視した自然保全への取り組み
                </li>
              </ul>
            </div>
            
            <div className="h-full">
              <div className="overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl relative h-full">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-light-green/20 via-transparent to-moss-green/20 rounded-2xl"></div>
                <div className="absolute inset-0 shadow-[0_0_50px_rgba(138,195,157,0.3)] rounded-2xl"></div>
                <ImagePlaceholder
                  src={img('futureVisionImage')}
                  alt="MOSS COUNTRY ロゴサイン - 未来への展望"
                  width={600}
                  height={500}
                  className="w-full h-full object-contain relative z-10 p-8"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-moss-green text-white">
        <Container>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
              {t('ctaTitle')}
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto font-light whitespace-pre-line">
              {t('ctaLead')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = '/store'}
              >
                店舗を訪れる
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = '/workshop'}
              >
                ワークショップに参加
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}