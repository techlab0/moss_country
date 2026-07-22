'use client';
import React, { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { getSimpleWorkshops } from '@/lib/sanity';
import { workshopImages, defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import type { SimpleWorkshop } from '@/types/sanity';
import { usePageContent } from '@/hooks/usePageContent';

const planMeta = [
  { id: 'glass-canister-ss', dimensions: '6cm × 11cm' },
  { id: 'glass-ball-s', dimensions: '10cm × 8cm' },
  { id: 'pop-jar', dimensions: '11cm × 6cm' },
  { id: 'glass-ball-m', dimensions: '15cm × 12cm' },
  { id: 'glass-ball-box-ll', dimensions: '15cm × 12cm' },
  { id: 'cliff-terrarium', dimensions: '8cm × 10cm' },
];

export default function WorkshopPage() {
  // 管理画面の「ページ編集」で保存された文言・画像を反映する（保存がなければ従来の文言・画像）
  const { t, img } = usePageContent('workshop');
  const workshopSizes = planMeta.map((meta, i) => ({
    ...meta,
    name: t(`plan${i + 1}Name`),
    price: t(`plan${i + 1}Price`),
    duration: t(`plan${i + 1}Duration`),
    description: t(`plan${i + 1}Desc`),
    image: img(`plan${i + 1}Image`),
  }));
  const testimonials = [1, 2, 3].map(i => ({
    name: t(`testimonial${i}Name`),
    age: t(`testimonial${i}Age`),
    course: t(`testimonial${i}Course`),
    comment: t(`testimonial${i}Comment`),
    rating: 5,
  }));
  const bookingSteps = [1, 2, 3, 4].map(i => ({
    step: String(i),
    title: t(`step${i}Title`),
    description: t(`step${i}Desc`),
  }));
  const [workshops, setWorkshops] = useState<SimpleWorkshop[]>([]);
  const [, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['workshop'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['workshop'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['workshop-mobile'].src);

  // 画面サイズを監視してモバイルかどうかを判定
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // ヒーロー画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    fetch(`/api/images/hero?page=workshop`)
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
    fetch(`/api/images/background?page=workshop&mobile=false`)
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
    fetch(`/api/images/background?page=workshop&mobile=true`)
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

  useEffect(() => {
    async function fetchWorkshops() {
      try {
        const data = await getSimpleWorkshops();
        setWorkshops(data);
      } catch (error) {
        console.error('Failed to fetch workshops:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkshops();
  }, []);
  return (
    <div
      className="min-h-screen relative site-page-tone"
      style={{
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        filter: isMobile ? 'brightness(1.2)' : 'none'
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
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {t('heroTitle')}
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8 whitespace-pre-line">
              {t('heroLead')}
            </p>
            <Button 
              variant="primary" 
              size="lg"
              className="bg-white !text-moss-green hover:bg-moss-green hover:!text-white"
              onClick={() => window.open('https://www.jalan.net/kankou/spt_guide000000228974/?msockid=3e4b092db2b0692107f61de6b3b568a6', '_blank')}
            >
              今すぐ予約する
            </Button>
          </div>
        </Container>
      </section>

      {/* Workshop Details */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                ワークショップ詳細
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                在庫次第で当日参加も可能です
              </p>
            </div>
          </div>
          
          {/* Workshop Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 mb-12">
            <Card className="text-center">
              <CardHeader className="!p-3 md:!p-6">
                <div className="w-10 h-10 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-xl font-bold text-moss-green mb-2">所要時間</h3>
                <p className="text-base md:text-2xl font-bold text-moss-green">約2時間</p>
                <p className="text-gray-600 text-xs md:text-sm mt-2">ゆっくりと丁寧に制作できます</p>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader className="!p-3 md:!p-6">
                <div className="w-10 h-10 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-xl font-bold text-moss-green mb-2">利用人数</h3>
                <p className="text-base md:text-2xl font-bold text-moss-green">1～4人</p>
                <p className="text-gray-600 text-xs md:text-sm mt-2">少人数での丁寧な指導</p>
              </CardHeader>
            </Card>

            <Card className="text-center col-span-2 md:col-span-1">
              <CardHeader className="!p-3 md:!p-6">
                <div className="w-10 h-10 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-xl font-bold text-moss-green mb-2">対象年齢</h3>
                <p className="text-base md:text-2xl font-bold text-moss-green">9歳以上推奨</p>
                <p className="text-gray-600 text-xs md:text-sm mt-2">お子様も楽しく参加できます</p>
              </CardHeader>
            </Card>
          </div>
          
          {/* Size Options */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">作品サイズ・料金</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {workshopSizes.map((size) => (
              <Card key={size.id} className="hover:transform hover:scale-105 transition-all duration-300">
                <div className="overflow-hidden">
                  <img
                    src={size.image}
                    alt={size.name}
                    className="w-full h-auto object-contain"
                  />
                </div>
                <CardHeader className="!p-3 md:!p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-0.5 md:gap-0 mb-2">
                    <h3 className="text-base md:text-2xl font-semibold text-moss-green">{size.name}</h3>
                    <span className="text-moss-green font-bold text-sm md:text-xl">{size.price}</span>
                  </div>
                  <p className="text-sm md:text-lg font-medium text-gray-700 mb-3">{size.dimensions}</p>
                  {size.duration && (
                    <p className="flex items-center gap-1 text-xs md:text-sm text-gray-600 mb-3">
                      <svg className="w-4 h-4 text-moss-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      所要時間：{size.duration}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm md:text-base whitespace-pre-line">{size.description}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg max-w-2xl mx-auto border border-white/20">
              <h4 className="text-lg font-semibold text-white mb-2">含まれるもの</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-white">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  必要道具一式
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  材料費
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  職人による指導
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  お手入れガイド
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>


      {/* Availability */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                受付可能日
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                店舗営業日であればいつでも対応可能です
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 mb-8">
                <div className="text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm md:text-xl font-bold text-moss-green mb-2">フレキシブルなスケジュール</h3>
                  <p className="text-gray-600 text-xs md:text-base">店舗営業日ならいつでもOK</p>
                </div>

                <div className="text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <h3 className="text-sm md:text-xl font-bold text-moss-green mb-2">事前予約推奨</h3>
                  <p className="text-gray-600 text-xs md:text-base">予約状況により当日参加可能</p>
                </div>

                <div className="text-center col-span-2 md:col-span-1">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm md:text-xl font-bold text-moss-green mb-2">少人数制</h3>
                  <p className="text-gray-600 text-xs md:text-base">1回最大4人まで</p>
                </div>
              </div>
              
              <div className="bg-light-green/20 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-moss-green mb-4">予約について</h4>
                <p className="text-gray-700 mb-4">
                  ワークショップの参加には事前の予約を推奨しております。<br/>
                  下のボタンからオンラインで空き状況を確認してご予約いただけます。<br/>
                  お問い合わせフォームやじゃらんからのご予約も可能です。
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="primary"
                    size="md"
                    className="bg-moss-green text-white hover:bg-moss-green/80"
                    onClick={() => window.location.href = '/workshop/booking'}
                  >
                    オンラインで予約する
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    className="border border-moss-green text-moss-green hover:bg-light-green/40"
                    onClick={() => window.open('https://www.jalan.net/kankou/spt_guide000000228974/?msockid=3e4b092db2b0692107f61de6b3b568a6', '_blank')}
                  >
                    じゃらんで予約
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                参加者の声
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                実際にワークショップに参加された皆様の感想
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-moss-green rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">{testimonial.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-moss-green">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.age}</div>
                    </div>
                  </div>
                  <div className="flex items-center mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="bg-light-green text-moss-green px-2 py-1 rounded text-sm">
                    {testimonial.course}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 italic">&quot;{testimonial.comment}&quot;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Booking Process */}
      <section className="py-20 relative">
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        <Container className="relative z-10">
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                予約の流れ
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {bookingSteps.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-base md:text-xl">{item.step}</span>
                  </div>
                  <h3 className="text-sm md:text-lg font-semibold text-moss-green mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-xs md:text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Mobile Workshop Banner */}
      <section className="py-20">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="bg-moss-green rounded-lg overflow-hidden shadow-lg">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    {t('mobileBannerTitle')}
                  </h2>
                  <p className="text-white/90 mb-6 whitespace-pre-line">
                    {t('mobileBannerLead')}
                  </p>
                  <div>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                      onClick={() => window.location.href = '/workshop/mobile'}
                    >
                      詳しく見る
                    </Button>
                  </div>
                </div>
                <div className="hidden md:block">
                  <img
                    src={img('mobileBannerImage')}
                    alt="出張ワークショップ"
                    className="w-full h-full object-cover"
                  />
                </div>
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
              {t('ctaTitle')}
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto whitespace-pre-line">
              {t('ctaLead')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.open('https://www.jalan.net/kankou/spt_guide000000228974/?msockid=3e4b092db2b0692107f61de6b3b568a6', '_blank')}
              >
                じゃらんで予約する
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'mailto:info@mosscountry.jp?subject=ワークショップについてのお問い合わせ'}
              >
                お問い合わせフォーム
              </Button>
            </div>
            <div className="mt-6">
              <p className="text-sm opacity-80">
                ※予約詳細はじゃらんまたはお問い合わせフォームよりお願いします
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
