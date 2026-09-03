'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { defaultBackgroundImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';

const mobileWorkshopMenus = [
  {
    id: 'glass-canister-ss',
    name: 'ガラスキャニスターSS',
    dimensions: '6cm × 11cm',
    price: '基本容器',
    description: '手のひらサイズの小さな苔の世界。短時間で完成するため、イベントでも気軽に楽しめます。',
    image: '/images/workshop/glass-canister-ss.JPG',
    time: '約90分',
  },
  {
    id: 'glass-ball-s',
    name: 'ガラスボールS',
    dimensions: '10cm × 8cm',
    price: '応相談',
    description: '丸いガラスの中に広がる小さな苔の森。体験の満足度が高く、人気のメニューです。',
    image: '/images/workshop/glass-ball-s.JPG',
    time: '約120分',
  },
  {
    id: 'pop-jar',
    name: 'ポップジャー',
    dimensions: '11cm × 6cm',
    price: '応相談',
    description: 'ころんと可愛い形の容器で、お子様にも人気。イベントの記念にぴったりです。',
    image: '/images/workshop/pop-jar.JPG',
    time: '約120分',
  },
];

const eventScenes = [
  {
    title: 'マルシェ・フェスティバル',
    description: '地域のマルシェやフェスティバルで、来場者が気軽に参加できるワークショップブースを設置します。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
  {
    title: '企業イベント・福利厚生',
    description: '社内レクリエーションやチームビルディングに。社員の皆様のリフレッシュや交流の場として好評です。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: '学校・教育施設',
    description: '小学校や児童館、PTA行事などで自然と触れ合う体験学習として。お子様の創造力を育みます。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: '結婚式・パーティー',
    description: '結婚式の余興やパーティーのアクティビティとして。ゲストの思い出に残る特別な体験を演出します。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A2.704 2.704 0 003 15.546M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

const features = [
  {
    title: '準備はすべてお任せ',
    description: '材料・道具・テーブルクロスなど必要なものはすべて持参します。会場のご準備は最小限でOKです。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    title: '経験豊富な職人が出向',
    description: '店舗と同じクオリティの指導を、あなたの会場で。丁寧なサポートで初めての方も安心です。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: '人数・内容を柔軟に対応',
    description: '少人数のプライベートイベントから大人数のフェスまで。ご要望に合わせたプランをご提案します。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: '完成作品はお持ち帰り',
    description: '作った作品はその場でお持ち帰りいただけます。イベントの素敵な記念品になります。',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
];

const pricingBasics = [
  { label: '講師料', value: '30,000円／日' },
  { label: '材料費', value: '1名あたり 1,500円' },
  { label: '交通費', value: '実費' },
  { label: '基本容器サイズ', value: '縦11cm × 横6cm' },
];

const assistanceFees = [
  { people: '〜20名', fee: '加算なし' },
  { people: '21〜30名', fee: '+10,000円' },
  { people: '31〜40名', fee: '+20,000円' },
  { people: '41〜50名', fee: '+30,000円' },
];

// フィギュアの扱い（資料「2. フィギュアについて」）。作品の完成度や制作の楽しさを考慮し、
// フィギュア付きでの開催を基本としている。
const figurePlans = [
  {
    name: '通常プラン',
    price: 'フィギュア代 200〜500円（税込）／個',
    notes: [
      '希望者のみお選びいただけます',
      '種類によって価格が異なります',
      '使用数に応じて追加精算となります',
    ],
  },
  {
    name: '法人・団体向け おまとめプラン',
    price: '材料費 2,000円（税込）／名（フィギュア代込み）',
    notes: [
      '会計を簡略化したい場合におすすめです',
      '対象フィギュアから自由に選択可能',
      '追加精算不要でスムーズにご精算いただけます',
    ],
  },
];

const cancellationFees = [
  { timing: '開催日の14日前以降', fee: '料金の30%' },
  { timing: '開催日の7日前以降', fee: '料金の50%' },
  { timing: '前日〜当日', fee: '料金の100%' },
];

const bookingSteps = [
  { step: '1', title: 'お問い合わせ', description: 'お電話・メール・フォームからお気軽にご連絡ください' },
  { step: '2', title: 'お打ち合わせ', description: '日程・人数・会場・ご予算などをヒアリングします' },
  { step: '3', title: 'お見積り・準備', description: '最適なプランをご提案。材料の準備を進めます' },
  { step: '4', title: '当日開催', description: '会場にお伺いし、楽しいワークショップを開催！' },
];

export default function MobileWorkshopPage() {
  const { t, img, imgAlt } = usePageContent('mobileWorkshop');
  const [isMobile, setIsMobile] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['workshop'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['workshop-mobile'].src);

  const editableMenus = mobileWorkshopMenus.map((menu, index) => {
    const number = index + 1;
    return {
      ...menu,
      name: t(`menu${number}Name`),
      dimensions: t(`menu${number}Dimensions`),
      price: t(`menu${number}Price`),
      description: t(`menu${number}Desc`),
      image: img(`menu${number}Image`),
      imageAlt: imgAlt(`menu${number}Image`, t(`menu${number}Name`)),
      time: t(`menu${number}Time`),
    };
  });
  const editableScenes = eventScenes.map((scene, index) => ({
    ...scene,
    title: t(`scene${index + 1}Title`),
    description: t(`scene${index + 1}Desc`),
  }));
  const editableFeatures = features.map((feature, index) => ({
    ...feature,
    title: t(`feature${index + 1}Title`),
    description: t(`feature${index + 1}Desc`),
  }));
  const editablePricingBasics = pricingBasics.map((item, index) => ({
    label: t(`price${index + 1}Label`),
    value: t(`price${index + 1}Value`),
  }));
  const editableAssistanceFees = assistanceFees.map((item, index) => ({
    people: t(`assist${index + 1}People`),
    fee: t(`assist${index + 1}Fee`),
  }));
  const editableFigurePlans = figurePlans.map((plan, index) => ({
    name: t(`figure${index + 1}Name`),
    price: t(`figure${index + 1}Price`),
    notes: t(`figure${index + 1}Notes`).split('\n').filter(Boolean),
  }));
  const editableCancellationFees = cancellationFees.map((item, index) => ({
    timing: t(`cancel${index + 1}Timing`),
    fee: t(`cancel${index + 1}Fee`),
  }));
  const editableBookingSteps = bookingSteps.map((item, index) => ({
    ...item,
    title: t(`step${index + 1}Title`),
    description: t(`step${index + 1}Desc`),
  }));

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    fetch(`/api/images/background?page=workshop&mobile=false`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setBackgroundImageUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load background image (PC), using default:', error);
      });
    fetch(`/api/images/background?page=workshop&mobile=true`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setBackgroundImageMobileUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load background image (Mobile), using default:', error);
      });
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
        filter: isMobile ? 'brightness(1.2)' : 'none',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" />

      {/* Hero Section */}
      <section
        className="py-20 relative min-h-screen flex items-center"
        style={{
          backgroundImage: `url('${img('heroImage')}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <Container className="relative z-10">
          <div className="text-center">
            <p className="text-lg md:text-xl text-white/80 mb-4 tracking-widest">MOSS COUNTRY</p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {t('heroTitle')}
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-4">
              {t('heroLead1')}
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
              {t('heroLead2')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="primary"
                size="lg"
                className="bg-white !text-moss-green hover:bg-moss-green hover:!text-white"
                onClick={() => window.location.href = '/contact'}
              >
                出張のご相談はこちら
              </Button>
              <Link href="/workshop">
                <Button
                  variant="ghost"
                  size="lg"
                  className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                >
                  店舗ワークショップを見る
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* About Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('aboutTitle')}
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent>
                <div className="p-4 md:p-8">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <img
                        src={img('aboutImage')}
                        alt={imgAlt('aboutImage', '出張ワークショップの様子')}
                        className="w-full h-auto rounded-lg"
                      />
                    </div>
                    <div>
                      <p className="text-gray-700 text-lg leading-relaxed mb-4">
                        {t('aboutText1')}
                      </p>
                      <p className="text-gray-700 text-lg leading-relaxed mb-4">
                        {t('aboutText2')}
                      </p>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        {t('aboutText3')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Event Scenes Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('scenesTitle')}
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                {t('scenesLead')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-8">
            {editableScenes.map((scene, index) => (
              <Card key={index} className="hover:transform hover:scale-105 transition-all duration-300">
                <CardHeader className="!p-3 md:!p-6">
                  {/* 2列にすると横幅が足りないため、狭い画面ではアイコンを文章の上に積む */}
                  <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-moss-green rounded-full flex items-center justify-center flex-shrink-0">
                      {scene.icon}
                    </div>
                    <div>
                      <h3 className="text-base md:text-xl font-bold text-moss-green mb-1 md:mb-2">
                        {scene.title}
                      </h3>
                      <p className="text-sm md:text-base text-gray-600">{scene.description}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Workshop Menu Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('menusTitle')}
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                {t('menusLead')}
              </p>
            </div>
          </div>

          {/* ワークショップページのプランカードと同じ密度・同じ並びに揃える
              （スマホで2列、価格はタイトルの下） */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {editableMenus.map((menu) => (
              <Card key={menu.id} className="hover:transform hover:scale-105 transition-all duration-300">
                <div className="overflow-hidden">
                  <img
                    src={menu.image}
                    alt={menu.imageAlt}
                    className="w-full h-auto object-contain"
                  />
                </div>
                <CardHeader className="!p-3 md:!p-6">
                  <div className="flex flex-col gap-0.5 mb-2">
                    <h3 className="text-base md:text-2xl font-semibold text-moss-green">{menu.name}</h3>
                    <span className="text-moss-green font-bold text-sm md:text-xl">{menu.price}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mb-3">
                    <p className="text-sm md:text-lg font-medium text-gray-700">{menu.dimensions}</p>
                    <span className="self-start bg-light-green text-moss-green px-2 py-1 rounded text-xs md:text-sm font-medium">
                      {menu.time}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-gray-600">{menu.description}</p>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg max-w-2xl mx-auto border border-white/20">
              <p className="text-white text-sm">
                <span className="whitespace-pre-line">{t('menusNote')}</span>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
        <Container className="relative z-10">
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('pricingTitle')}
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                {t('pricingLead')}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('basicPricingTitle')}</h3>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-200">
                  {editablePricingBasics.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-4">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="text-right text-lg font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('assistanceTitle')}</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 bg-light-green text-moss-green font-semibold">
                    <div className="px-4 py-3">参加人数</div>
                    <div className="px-4 py-3 text-right">加算額</div>
                  </div>
                  {editableAssistanceFees.map((item) => (
                    <div key={item.people} className="grid grid-cols-2 border-t border-gray-200 bg-white">
                      <div className="px-4 py-3 text-gray-700">{item.people}</div>
                      <div className="px-4 py-3 text-right font-semibold text-gray-900">{item.fee}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('figureTitle')}</h3>
                <p className="text-gray-600 mt-2">
                  {t('figureLead')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {editableFigurePlans.map((plan) => (
                    <div key={plan.name} className="rounded-lg bg-gray-50 p-4">
                      <p className="font-semibold text-moss-green">{plan.name}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{plan.price}</p>
                      <ul className="mt-3 space-y-1 text-sm text-gray-700">
                        {plan.notes.map((note) => (
                          <li key={note}>・{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('hostingTitle')}</h3>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {t('hostingConditions').split('\n').filter(Boolean).map((condition) => (
                    <div key={condition} className="rounded-lg bg-gray-50 p-4 text-gray-700 leading-relaxed">
                      {condition}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('cancellationTitle')}</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {editableCancellationFees.map((item) => (
                    <div key={item.timing} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
                      <span className="text-gray-700">{item.timing}</span>
                      <span className="text-lg font-semibold text-gray-900">{item.fee}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                  <span className="whitespace-pre-line">{t('cancellationNote')}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('facilityTitle')}</h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {t('facilityGuides').split('\n').filter(Boolean).map((guide) => (
                    <li key={guide} className="rounded-lg bg-gray-50 p-4 text-gray-700 leading-relaxed">
                      {guide}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">{t('importantTitle')}</h3>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {t('importantNotes').split('\n').filter(Boolean).map((note) => (
                    <p key={note} className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">
                      {note}
                    </p>
                  ))}
                </div>
                <p className="mt-5 text-sm text-gray-600">
                  {t('importantFooter')}
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        <Container className="relative z-10">
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('featuresTitle')}
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
            {editableFeatures.map((feature, index) => (
              <div key={index} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-moss-green rounded-full flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-moss-green mb-1 md:mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Booking Flow Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('stepsTitle')}
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {editableBookingSteps.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-white/80 text-sm">{item.description}</p>
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
            <p className="text-xl mb-4 opacity-90 max-w-2xl mx-auto">
              {t('ctaLead1')}
            </p>
            <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
              {t('ctaLead2')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="ghost"
                size="lg"
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = '/contact'}
              >
                お問い合わせフォーム
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'tel:080-3605-6340'}
              >
                お電話でのご相談
              </Button>
            </div>
            <div className="mt-6">
              <p className="text-sm opacity-80">
                {t('ctaNote')}
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
