'use client';
import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

const timeline = [
  {
    year: '2024',
    title: 'テラリウムとの出会い',
    description: '代表の立桶が北海道の豊かな自然と苔の魅力に心を奪われ、独自の制作技術を追求し始める。',
  },
  {
    year: '2025',
    title: 'MOSS COUNTRY設立',
    description: '北海道の札幌にMOSS COUNTRYを設立。地域初のカプセルテラリウム専門店として話題に。',
  },
  {
    year: '2025',
    title: 'ワークショップ開始',
    description: 'より多くの人にテラリウムの魅力を伝えるため、本格的なワークショップ教室を開始。',
  },
  {
    year: '2025',
    title: '実店舗オープン',
    description: 'オンライン販売を開始し、全国の皆様に北海道のテラリウムをお届け。実店舗での体験もさらに充実。',
  },
];

const values = [
  {
    title: 'AUTHENTICITY',
    description: '北海道の自然そのものを表現する、本物の美しさを追求しています。',
  },
  {
    title: 'CRAFTSMANSHIP',
    description: '一つひとつ手作りで仕上げる、妥協なき職人技術。',
  },
  {
    title: 'SUSTAINABILITY',
    description: '自然への敬意を込めた、持続可能な素材選びと製法。',
  },
  {
    title: 'EXPERIENCE',
    description: '単なる商品ではなく、心に残る特別な体験を提供。',
  },
];


export default function StoryPage() {
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
      <section 
        className="py-20 relative min-h-screen flex items-center"
        style={{
          backgroundImage: `url('/images/story/mosscountry_story_kv.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-6 drop-shadow-2xl px-4">
              小さな緑に込めた、大きな想い
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-xl text-white max-w-3xl mx-auto drop-shadow-lg">
              MOSS COUNTRYの想い、職人の技術、テラリウムへの情熱。
              私たちがなぜテラリウムを作り続けるのか、その理由をお話しします。
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
              <blockquote className="text-2xl md:text-3xl text-white font-light leading-relaxed mb-8">
                「北海道の苔が織りなす小宇宙を、<br />
                あなたの日常に。」
              </blockquote>
              <p className="text-lg text-white/90 font-light">
                自然の息づかいを感じられる、唯一無二のテラリウム体験を。<br />
                代表 立桶が追求する、新しい癒しのかたち。
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
                一つの出会いから生まれた、MOSS COUNTRYストーリー
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
                    <h3 className="text-xl font-bold text-white tracking-wide">{item.title}</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed font-light">{item.description}</p>
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
              <p className="text-lg text-white/90 mb-6 leading-relaxed font-light">
                代表 立桶による、北海道の自然を知り尽くした職人技。<br />
                機械では表現できない繊細さと、自然への深い理解が生み出す唯一無二の作品。
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-light-green mb-2 tracking-wide text-sm sm:text-base break-words">MATERIAL SELECTION</h4>
                    <p className="text-white/80 font-light">北海道産の希少な苔を厳選して採取またはパートナーから取り寄せます。</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-light-green mb-2 tracking-wide text-sm sm:text-base break-words">ORIGINAL TECHNIQUE</h4>
                    <p className="text-white/80 font-light">北海道の苔の特性を活かす独自の配置・育成技法で作成します。</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-light-green mb-2 tracking-wide text-sm sm:text-base break-words">QUALITY ASSURANCE</h4>
                    <p className="text-white/80 font-light">完成後のケア指導から定期メンテナンスまで、長期にわたる品質保証サポートします。</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => window.location.href = '/products'}
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
                  src="/images/story/mosscountry_story_craftmanship.jpg"
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
                北海道で根ざす、新しい文化を
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed font-light">
                札幌を拠点に、北海道各地に苔テラリウムの魅力を広め、<br />
                地域に根ざした新しいライフスタイル文化を育みたい。
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
                  地元観光業との連携・北海道の魅力発信
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  北海道の自然保護と持続可能な採取活動
                </li>
              </ul>
            </div>
            
            <div className="h-full">
              <div className="overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl relative h-full">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-light-green/20 via-transparent to-moss-green/20 rounded-2xl"></div>
                <div className="absolute inset-0 shadow-[0_0_50px_rgba(138,195,157,0.3)] rounded-2xl"></div>
                <ImagePlaceholder
                  src="/images/story/mosscountry_logo_sign.png"
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
              あなたも、この特別な世界へ
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto font-light">
              立桶が創り出す、北海道発のテラリウム体験。<br />
              あなたの日常に、新しい癒しをお届けします。
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