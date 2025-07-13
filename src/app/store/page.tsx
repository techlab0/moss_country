'use client';
import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const storeInfo = {
  name: 'MOSS COUNTRY',
  address: '札幌市西区発寒11条4丁目3-1',
  phone: '011-xxx-xxxx',
  email: 'mosscountry***************@gmail.com',
  hours: {
    weekday: '10:00 - 18:00',
    weekend: '10:00 - 19:00',
    closed: '月曜日（祝日の場合は翌日）',
  },
  parking: '近隣のコインパーキングをご利用ください',
  access: {
    subway: 'JR函館本線「発寒駅」より徒歩8分',
    bus: 'JRバス「発寒11条4丁目」停留所より徒歩1分',
    car: '新千歳空港より車で約50分',
  },
};

const facilities = [
  {
    name: 'ショールーム',
    description: '100種類以上のテラリウムを実際に手に取ってご覧いただけます',
    icon: '🏪',
    image: '/images/store/interior01.jpg',
  },
  {
    name: 'ワークショップスペース',
    description: '最大10名様まで同時に作業できる広々とした制作スペース',
    icon: '🎨',
    image: '/images/store/workshop-room.jpg',
  },
];

const services = [
  {
    title: '商品販売',
    description: '完成品テラリウムの販売',
    price: '¥3,200〜',
    details: ['初心者向けから上級者向けまで', '100種類以上の豊富な品揃え', 'ギフト包装無料'],
  },
  {
    title: 'オーダーメイド',
    description: 'お客様のご要望に合わせた特別制作',
    price: '¥8,000〜',
    details: ['完全カスタマイズ対応', '制作期間：1-2週間', '事前相談無料'],
  },
  {
    title: 'メンテナンス',
    description: 'テラリウムのお手入れ・修理',
    price: '¥1,500〜',
    details: ['植物の植え替え', '容器のクリーニング', '1年間の保証付き'],
  },
  {
    title: 'ワークショップ',
    description: '手作り体験教室',
    price: '¥4,800〜',
    details: ['初心者から上級者まで', '材料・道具込み', '作品持ち帰り可'],
  },
];


const faq = [
  {
    question: '駐車場はありますか？',
    answer: '専用駐車場はございませんが、近隣に複数のコインパーキングがございます。お車でお越しの際は事前にご確認ください。',
  },
  {
    question: '予約は必要ですか？',
    answer: '商品のご購入やご見学は予約不要です。ワークショップやオーダーメイドのご相談は事前予約をお勧めいたします。',
  },
  {
    question: 'クレジットカードは使えますか？',
    answer: 'VISA、MasterCard、JCB、American Express、各種電子マネー、QRコード決済に対応しております。',
  },
  {
    question: 'テラリウムの育て方を教えてもらえますか？',
    answer: 'もちろんです。購入時に詳しいお手入れ方法をご説明いたします。その後のご質問もお気軽にお電話ください。',
  },
];

export default function StorePage() {
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
        <div className="absolute inset-0 bg-stone-900/85 backdrop-blur-md" />
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              北海道で出会う、本物のテラリウム体験
            </h1>
            <div className="w-24 h-1 bg-emerald-400 mx-auto mb-8"></div>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto mb-8">
              札幌の中心部にある私たちの店舗で、実際に手に取って、
              テラリウムの美しさと職人の技術を感じてください。
            </p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => {
                const accessSection = document.getElementById('access-info');
                if (accessSection) {
                  accessSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="cursor-pointer"
            >
              アクセス情報を見る
            </Button>
          </div>
        </Container>
      </section>

      {/* Store Information */}
      <section className="py-20" id="access-info">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                店舗情報
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Store Details */}
            <div className="glass-card p-8 rounded-3xl">
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-light-green md:text-light-green text-gray-900 mb-1">住所</h3>
                    <p className="text-white md:text-white text-gray-800 break-words">{storeInfo.address}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-light-green md:text-light-green text-gray-900 mb-1">電話番号</h3>
                    <p className="text-white md:text-white text-gray-800 break-words">{storeInfo.phone}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-light-green md:text-light-green text-gray-900 mb-1">メールアドレス</h3>
                    <p className="text-white md:text-white text-gray-800 break-words">{storeInfo.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-light-green md:text-light-green text-gray-900 mb-1">営業時間</h3>
                    <div className="text-white md:text-white text-gray-800 space-y-1">
                      <p className="break-words">平日: {storeInfo.hours.weekday}</p>
                      <p className="break-words">土日祝: {storeInfo.hours.weekend}</p>
                      <p className="text-red-600 md:text-red-600 text-red-800 break-words">定休日: {storeInfo.hours.closed}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="glass-card p-8 rounded-3xl">
              <h2 className="text-3xl font-bold text-light-green md:text-light-green text-gray-900 mb-8">アクセスマップ</h2>
              <div className="h-64 rounded-lg overflow-hidden mb-6">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2913.5264158063487!2d141.29211759999998!3d43.0934509!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5f0b2967fe4c6bc9%3A0x5f6284f1ebb2447c!2zTW9zcyBDb3VudHJ544CQ6IuU44OG44Op44Oq44Km44Og5L2c5oiQ44O744Ov44O844Kv44K344On44OD44OX44CR!5e0!3m2!1sja!2sjp!4v1752175558799!5m2!1sja!2sjp"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="MOSS COUNTRY地図"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-white md:text-white text-gray-800 break-words">{storeInfo.access.subway}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                    </svg>
                  </span>
                  <span className="text-white md:text-white text-gray-800 break-words">{storeInfo.access.bus}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-white md:text-white text-gray-800 break-words">{storeInfo.access.car}</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Facilities */}
      <section className="py-20 relative">
        <Container className="relative z-10">
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                店舗設備・施設
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                快適にお過ごしいただける充実した設備
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {facilities.map((facility, index) => (
              <div key={index} className="group">
                <div className="relative overflow-hidden rounded-lg shadow-lg">
                  <img 
                    src={facility.image} 
                    alt={facility.name}
                    className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-center mb-2">
                      <span className="text-3xl mr-3">{facility.icon}</span>
                      <h3 className="text-2xl font-bold">{facility.name}</h3>
                    </div>
                    <p className="text-white/90 text-lg">{facility.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Services & Pricing */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                サービス・料金
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                お客様のニーズに合わせた多様なサービス
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-moss-green">{service.title}</h3>
                    <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm font-medium">
                      {service.price}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4">{service.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-moss-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="secondary" 
                    className="w-full mt-4 cursor-pointer"
                    onClick={() => window.location.href = 'mailto:info@mosscountry.jp?subject=' + encodeURIComponent(service.title + 'についてのお問い合わせ')}
                  >
                    詳しく問い合わせる
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Store Gallery */}
      <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-white p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-moss-green mb-6">
                店舗の様子
              </h2>
              <div className="w-24 h-1 bg-moss-green mx-auto mb-6"></div>
              <p className="text-lg text-gray-600">
                温かみのある空間で皆様をお迎えします
              </p>
            </div>
          </div>

          <div className="relative min-h-[600px] overflow-hidden">
            {/* Gallery Image Area - overlapping images */}
            <div className="absolute inset-0 z-0">
              {/* Large background image - img01 equivalent */}
              <div className="absolute top-0 left-0 w-[420px] h-[280px] overflow-hidden shadow-xl z-10">
                <img src="/images/store/interior01.jpg" alt="店内の様子" className="w-full h-full object-cover brightness-110 contrast-105 saturate-110" />
              </div>
              
              {/* Medium image - img02 equivalent */}
              <div className="absolute top-16 right-8 w-[350px] h-[235px] overflow-hidden shadow-xl z-20">
                <img src="/images/store/workshop-room.jpg" alt="ワークショップルーム" className="w-full h-full object-cover brightness-105 contrast-110 saturate-105" />
              </div>
              
              {/* Large image - img03 equivalent */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[480px] h-[320px] overflow-hidden shadow-xl z-30">
                <img src="/images/store/exterior.jpg" alt="店舗外観" className="w-full h-full object-cover brightness-115 contrast-105 saturate-110" />
              </div>
              
              {/* Medium moving image - img04 equivalent */}
              <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-[320px] h-[180px] overflow-hidden shadow-xl z-40">
                <img src="/images/store/interior02.jpg" alt="店内の様子2" className="w-full h-full object-cover brightness-110 contrast-105 saturate-105" />
              </div>
              
              {/* Additional smaller images */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-[280px] h-[180px] overflow-hidden shadow-xl z-15">
                <img src="/images/store/exterior02.jpeg" alt="店舗外観2" className="w-full h-full object-cover brightness-110 contrast-110 saturate-110" />
              </div>
              
              <div className="absolute bottom-8 right-8 w-[250px] h-[160px] overflow-hidden shadow-xl z-25">
                <img src="/images/store/interior03.jpeg" alt="店内の様子3" className="w-full h-full object-cover brightness-105 contrast-105 saturate-105" />
              </div>
              
              {/* Handwritten text - crayon/chalk style */}
              <div className="absolute bottom-12 left-8 z-50">
                <div className="transform -rotate-12">
                  <p className="text-4xl font-bold text-moss-green opacity-90 select-none" 
                     style={{
                       fontFamily: '"Kalam", "Caveat", "Amatic SC", "Shadows Into Light", "Permanent Marker", "Indie Flower", cursive',
                       letterSpacing: '1px'
                     }}>
                    テラリウムとともに
                  </p>
                  <p className="text-3xl font-bold text-moss-green opacity-85 mt-2 ml-4 select-none" 
                     style={{
                       fontFamily: '"Kalam", "Caveat", "Amatic SC", "Shadows Into Light", "Permanent Marker", "Indie Flower", cursive',
                       letterSpacing: '1px'
                     }}>
                    特別なひとときを。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                よくあるご質問
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {faq.map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-moss-green flex items-start">
                    <span className="bg-moss-green text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">
                      Q
                    </span>
                    {item.question}
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start">
                    <span className="bg-light-green text-moss-green rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">
                      A
                    </span>
                    <p className="text-gray-700">{item.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-moss-green text-white">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ぜひ店舗にお越しください
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              実際にテラリウムを手に取って、その美しさと職人の技術を感じてください。
              スタッフ一同、心よりお待ちしております。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'tel:011-123-4567'}
              >
                お電話でお問い合わせ
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'mailto:info@mosscountry.jp'}
              >
                メールでお問い合わせ
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}