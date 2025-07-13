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
    description: '代表の田中が偶然見つけた小さなテラリウムに心を奪われ、独学で制作技術を学び始める。',
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
    title: '自然への敬意',
    description: '自然の美しさと神秘性を大切にし、テラリウムを通じて人と自然をつなぐ架け橋となることを目指しています。',
    icon: '🌿',
  },
  {
    title: '職人の技',
    description: '一つひとつの作品に魂を込め、妥協のない品質で、お客様に感動をお届けすることを心がけています。',
    icon: '🎨',
  },
  {
    title: '持続可能性',
    description: '環境に配慮した素材選びと製法により、地球にやさしいテラリウムづくりを実践しています。',
    icon: '🌍',
  },
  {
    title: 'コミュニティ',
    description: 'テラリウムを愛する人々のコミュニティを育み、知識と経験を共有し合える場を提供します。',
    icon: '🤝',
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
      <section className="py-20 relative">
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-emerald-50/70" />
        <div className="absolute inset-0 bg-emerald-950/10" />
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-moss-green mb-6">
              小さな緑に込めた、大きな想い
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                私たちのミッション
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-0"></div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="glass-card-dark text-center p-8 rounded-3xl">
              <blockquote className="text-2xl md:text-3xl text-white italic leading-relaxed mb-8">
                「小さなガラスの中に広がる自然の世界を通じて、<br />
                現代人の心に癒しと感動をお届けし、<br />
                人と自然の新しい関係を築いていく」
              </blockquote>
              <p className="text-lg text-white">
                これが私たちMOSS COUNTRYの変わらぬ想いです。
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                私たちの価値観
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100 max-w-2xl mx-auto">
                MOSS COUNTRYの活動を支える4つの核となる価値観
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="text-6xl mb-4">{value.icon}</div>
                  <h3 className="text-xl font-semibold text-moss-green mb-4">{value.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                MOSS COUNTRYの歩み
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                小さな出会いから始まった私たちの物語
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-moss-green"></div>
              
              {timeline.map((item, index) => (
                <div key={index} className="relative flex items-start mb-12 last:mb-0">
                  {/* Timeline marker */}
                  <div className="relative">
                    <div className="w-8 h-8 bg-moss-green rounded-full z-10 relative"></div>
                    {index < timeline.length - 1 && (
                      <div className="absolute top-6 left-4 transform -translate-x-1/2">
                        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-moss-green"></div>
                      </div>
                    )}
                  </div>
                  <div className="ml-8 flex-1">
                    <div className="bg-white rounded-lg p-6 shadow-md">
                      <div className="flex items-center mb-2">
                        <span className="bg-light-green text-moss-green px-3 py-1 rounded-full text-sm font-medium mr-3">
                          {item.year}
                        </span>
                        <h3 className="text-xl font-semibold text-moss-green">{item.title}</h3>
                      </div>
                      <p className="text-gray-700">{item.description}</p>
                    </div>
                  </div>
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                職人の技術へのこだわり
              </h2>
              <p className="text-lg text-white mb-6 leading-relaxed">
                私たちは機械では再現できない「手作りの温かさ」を大切にしています。
                一つひとつの素材選びから最終的な仕上げまで、すべて職人の手によって丁寧に作り上げられます。
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-light-green mb-1">素材の厳選</h4>
                    <p className="text-white/90">北海道の豊かな自然から採取した上質な苔と、相性の良い植物を厳選使用</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-light-green mb-1">独自の技法</h4>
                    <p className="text-white/90">伝統的な技術に現代の知識を融合させた、MOSS COUNTRY独自の制作技法</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-light-green rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-light-green mb-1">品質管理</h4>
                    <p className="text-white/90">完成後も定期的なメンテナンスとアフターケアで、長く美しさを保ちます</p>
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
                  職人の作品を見る
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="h-48 overflow-hidden rounded-lg">
                <ImagePlaceholder
                  src="/images/store/workshop-room.jpg"
                  alt="MOSS COUNTRY職人の手作業によるテラリウム制作"
                  width={800}
                  height={600}
                  className="w-full h-full object-cover"
                  
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 overflow-hidden rounded-lg">
                  <ImagePlaceholder
                    src="/images/misc/tera01.jpeg"
                    alt="素材選びから仕上げまでの職人技術"
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                    
                  />
                </div>
                <div className="h-32 overflow-hidden rounded-lg">
                  <ImagePlaceholder
                    src="/images/misc/moss02.jpeg"
                    alt="完成したテラリウムの品質確認"
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                    
                  />
                </div>
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
            <h2 className="text-3xl md:text-4xl font-bold text-moss-green mb-6">
              これからの展望
            </h2>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-moss-green mb-4">
                より多くの人にテラリウムの魅力を
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                私たちの最終的な目標は、テラリウムを通じてより多くの人が自然と触れ合い、
                心の豊かさを感じられる社会を作ることです。
              </p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  全国への技術普及とワークショップ展開
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  環境保護活動への参加と貢献
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  新しい技術開発と品質向上の追求
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <div className="h-48 overflow-hidden rounded-lg">
                <ImagePlaceholder
                  src="/images/store/interior01.jpg"
                  alt="未来への展望 - 美しく陳列されたテラリウム作品"
                  width={600}
                  height={400}
                  className="w-full h-full object-cover"
                  
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 overflow-hidden rounded-lg">
                  <ImagePlaceholder
                    src="/images/misc/tera-02.jpeg"
                    alt="多様なテラリウム作品"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover"
                    
                  />
                </div>
                <div className="h-24 overflow-hidden rounded-lg">
                  <ImagePlaceholder
                    src="/images/store/exterior.jpg"
                    alt="MOSS COUNTRY店舗外観"
                    width={300}
                    height={200}
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
              私たちと一緒にテラリウムの世界を楽しみませんか？
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              MOSS COUNTRYの想いに共感していただけましたら、
              ぜひ店舗にお越しいただくか、ワークショップにご参加ください。
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