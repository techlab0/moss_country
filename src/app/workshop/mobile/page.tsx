'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';

const mobileWorkshopMenus = [
  {
    id: 'glass-canister-ss',
    name: 'ガラスキャニスターSS',
    dimensions: '6cm × 11cm',
    price: '基本容器',
    description: '手のひらサイズの小さな苔の世界。短時間で完成するため、イベントでも気軽に楽しめます。',
    image: '/images/workshop/glass-canister-ss.JPG',
    time: '約60分',
  },
  {
    id: 'glass-ball-s',
    name: 'ガラスボールS',
    dimensions: '10cm × 8cm',
    price: '応相談',
    description: '丸いガラスの中に広がる小さな苔の森。体験の満足度が高く、人気のメニューです。',
    image: '/images/workshop/glass-ball-s.JPG',
    time: '約90分',
  },
  {
    id: 'pop-jar',
    name: 'ポップジャー',
    dimensions: '11cm × 6cm',
    price: '応相談',
    description: 'ころんと可愛い形の容器で、お子様にも人気。イベントの記念にぴったりです。',
    image: '/images/workshop/pop-jar.JPG',
    time: '約90分',
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

const hostingConditions = [
  '最小開催人数の定めはございません。講師料・材料費・交通費をお支払いいただければ開催いたします。',
  '1回あたり最大10名までを目安とし、1日最大2回まで開催可能です（原則20名まで）。',
  '20名以上での開催は、内容・運営体制を相談の上決定します。',
  '開催可能な最大人数は50名までです。51名以上での開催は承っておりません。',
  '少人数プランもございます。詳細はお問い合わせください。',
];

const cancellationFees = [
  { timing: '開催日の14日前以降', fee: '料金の30%' },
  { timing: '開催日の7日前以降', fee: '料金の50%' },
  { timing: '前日〜当日', fee: '料金の100%' },
];

const facilityGuides = [
  '所要時間は60〜120分です。人数・内容により前後します。',
  '準備は約60分、撤収は約60分を目安としています。',
  '会議テーブル（180cm）1台につき、参加目安は3名までです。',
  '対象年齢は小学生以上です。小学生は保護者同伴で参加可能です。',
];

const importantNotes = [
  'ワークショップ中の怪我、衣服の汚れ等につきましては十分に配慮いたしますが、責任を負いかねる場合がございます。',
  '制作後の管理環境や経年変化により、植物の状態が変化する場合がございます。',
  '記録・広報を目的として、制作風景を撮影させていただく場合がございます。',
  '天候不良、災害、交通機関の影響等により開催が困難な場合、日程変更または中止をご相談させていただく場合がございます。',
  'お支払いは事前精算をお願いしております。内容追加や人数変更等による追加費用は後日精算をお願いいたします。',
];

const bookingSteps = [
  { step: '1', title: 'お問い合わせ', description: 'お電話・メール・フォームからお気軽にご連絡ください' },
  { step: '2', title: 'お打ち合わせ', description: '日程・人数・会場・ご予算などをヒアリングします' },
  { step: '3', title: 'お見積り・準備', description: '最適なプランをご提案。材料の準備を進めます' },
  { step: '4', title: '当日開催', description: '会場にお伺いし、楽しいワークショップを開催！' },
];

export default function MobileWorkshopPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['workshop'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['workshop'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['workshop-mobile'].src);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
      });
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
      className="min-h-screen relative"
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
          backgroundImage: `url('${heroImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <Container className="relative z-10">
          <div className="text-center">
            <p className="text-lg md:text-xl text-white/80 mb-4 tracking-widest">MOSS COUNTRY</p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              出張ワークショップ
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-4">
              あなたのイベント会場に、苔テラリウムの体験をお届けします。
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
              マルシェやフェスティバル、企業イベント、学校行事など、
              さまざまな場所で本格的なテラリウム制作を体験いただけます。
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
                出張ワークショップとは
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
                        src="/images/workshop/mosscountry_workshop.png"
                        alt="出張ワークショップの様子"
                        className="w-full h-auto rounded-lg"
                      />
                    </div>
                    <div>
                      <p className="text-gray-700 text-lg leading-relaxed mb-4">
                        Moss Countryの出張ワークショップは、イベント会場やご指定の場所に職人が直接お伺いし、苔テラリウムの制作体験を提供するサービスです。
                      </p>
                      <p className="text-gray-700 text-lg leading-relaxed mb-4">
                        材料や道具はすべて持参するため、会場側のご準備は最小限。テーブルとスペースがあれば、どこでも開催可能です。
                      </p>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        イベント主催者様も、一般のお客様も、お気軽にご相談ください。人数やご予算に合わせた最適なプランをご提案いたします。
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
                こんなシーンで活躍しています
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                さまざまなイベントや場所でワークショップを開催しています
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {eventScenes.map((scene, index) => (
              <Card key={index} className="hover:transform hover:scale-105 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-moss-green rounded-full flex items-center justify-center flex-shrink-0">
                      {scene.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-moss-green mb-2">{scene.title}</h3>
                      <p className="text-gray-600">{scene.description}</p>
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
                選べるワークショップメニュー
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                持ち運びしやすいサイズを中心にご用意しています
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {mobileWorkshopMenus.map((menu) => (
              <Card key={menu.id} className="hover:transform hover:scale-105 transition-all duration-300">
                <div className="overflow-hidden">
                  <img
                    src={menu.image}
                    alt={menu.name}
                    className="w-full h-auto object-contain"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-semibold text-moss-green">{menu.name}</h3>
                    <span className="text-moss-green font-bold text-xl">{menu.price}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <p className="text-lg font-medium text-gray-700">{menu.dimensions}</p>
                    <span className="bg-light-green text-moss-green px-2 py-1 rounded text-sm font-medium">
                      {menu.time}
                    </span>
                  </div>
                  <p className="text-gray-600">{menu.description}</p>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg max-w-2xl mx-auto border border-white/20">
              <p className="text-white text-sm">
                ※ 出張ワークショップの基本材料費は1名あたり1,500円です。<br />
                ※ 上記以外のメニューもご相談に応じて対応可能です。<br />
                ※ 容器・内容の変更により追加費用が発生する場合があります。
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
                料金・開催条件
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                出張ワークショップの基本料金と人数ごとの目安です
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">基本料金</h3>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-200">
                  {pricingBasics.map((item) => (
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
                <h3 className="text-2xl font-bold text-moss-green">運営補助費</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 bg-light-green text-moss-green font-semibold">
                    <div className="px-4 py-3">参加人数</div>
                    <div className="px-4 py-3 text-right">加算額</div>
                  </div>
                  {assistanceFees.map((item) => (
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
                <h3 className="text-2xl font-bold text-moss-green">開催条件</h3>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {hostingConditions.map((condition) => (
                    <div key={condition} className="rounded-lg bg-gray-50 p-4 text-gray-700 leading-relaxed">
                      {condition}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">キャンセル料</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cancellationFees.map((item) => (
                    <div key={item.timing} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
                      <span className="text-gray-700">{item.timing}</span>
                      <span className="text-lg font-semibold text-gray-900">{item.fee}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                  キャンセル料は、講師料・材料費・運営補助費・交通費等を含む総額を基準として算出いたします。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">所要時間・設備目安</h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {facilityGuides.map((guide) => (
                    <li key={guide} className="rounded-lg bg-gray-50 p-4 text-gray-700 leading-relaxed">
                      {guide}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-2xl font-bold text-moss-green">補足事項・注意事項</h3>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {importantNotes.map((note) => (
                    <p key={note} className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">
                      {note}
                    </p>
                  ))}
                </div>
                <p className="mt-5 text-sm text-gray-600">
                  上記内容は目安です。会場条件・安全配慮・スタッフ状況により調整する場合がございます。
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
                出張ワークショップの特徴
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-14 h-14 bg-moss-green rounded-full flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-moss-green mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
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
                ご依頼の流れ
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {bookingSteps.map((item, index) => (
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
              出張ワークショップのご相談、お気軽にどうぞ
            </h2>
            <p className="text-xl mb-4 opacity-90 max-w-2xl mx-auto">
              イベント主催者の方も、個人でのお問い合わせも大歓迎です。
            </p>
            <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
              「こんなイベントでできる？」「予算はどれくらい？」など、まずはお気軽にご連絡ください。
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
                ※ 出張範囲・交通費等についてはお問い合わせ時にご相談ください
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
