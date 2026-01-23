'use client';
import React, { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { getHeroImage, getBackgroundImage, defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';

const timeline = [
  {
    year: '1990-2000s',
    title: '自然との出会い',
    titleEn: 'Meeting Nature',
    description: '幼い頃から自然や動物が大好きで、両親に連れられて森や山へ出かけていました。中でも心を惹かれたのが、静かに息づく小さな苔。見つめているだけで心が落ち着き、時がたつのを忘れるほどでした。',
    descriptionEn: 'From childhood, I loved nature and animals. Among them, moss fascinated me - a quiet, living beauty that made time stand still.',
  },
  {
    year: '2024',
    title: '苔とテラリウムとの再会',
    titleEn: 'Rediscovering Moss & Terrariums',
    description: '自分の仕事を持ちたいと考えたとき、心に浮かんだのは苔でした。<br/>人々が知らない苔の魅力を伝え、癒しを届けたい。<br/>北海道には苔テラリウムの文化がまだ少なく、「それなら自分が広めよう」と決意しました。',
    descriptionEn: 'When I dreamed of creating my own work, moss came to mind.<br/>I wanted to share its quiet beauty and bring healing to people.<br/>Since Hokkaido had few moss terrarium spaces, I decided to create one myself.',
  },
  {
    year: '2025',
    title: 'MOSS COUNTRY設立',
    titleEn: 'The Birth of Moss Country',
    description: '見本のない中、独学で知識を深め、店舗の掃除や改装も自らの手で。<br/>こうして札幌に苔の専門店「Moss Country」が誕生しました。<br/>名前には、「日本を苔の国=Moss Countryにしたい」という願いを込めています。',
    descriptionEn: 'Without any precedents, I studied on my own, renovated an old space by hand, and opened Moss Country - Hokkaido\'s first moss terrarium specialty Shop.<br/>The name reflects my wish to make Japan a true Moss Country.',
  },
  {
    year: '2026',
    title: '未来へ',
    titleEn: 'Looking Ahead',
    description: 'これからはレンタル事業や苔セラピーを通じて、癒しの空間を広げていきます。<br/>子どもたちや地域の人々にも、苔を通して自然の素晴らしさを伝えたい。',
    descriptionEn: 'Through moss rental and therapy, I hope to create spaces that soothe the heart.<br/>I wish to share the beauty of nature with children and communities across Japan.',
  },
];

const values = [
  {
    title: 'AUTHENTICITY',
    description: '苔の素晴らしさを伝えるために本物の美しさを追求しています。',
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
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['story'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['story'].src);

  // ヒーロー画像を取得
  useEffect(() => {
    getHeroImage('story').then((imageInfo) => {
      setHeroImageUrl(imageInfo.src);
    }).catch(() => {
      // エラー時はデフォルト画像を使用
    });
  }, []);

  // 背景画像を取得
  useEffect(() => {
    getBackgroundImage('story').then((imageInfo) => {
      setBackgroundImageUrl(imageInfo.src);
    }).catch(() => {
      // エラー時はデフォルト画像を使用
    });
  }, []);

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('${backgroundImageUrl}')`,
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
                「苔のある生活をあなたに。<br />
                生活に癒しと和みを。」
              </blockquote>
              <p className="text-lg text-white/90 font-light">
                苔の美しさを通して、心と暮らしに穏やかな時間を届けます。<br />
                代表 立桶が提案する、新しい癒しのかたち。
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
              <p className="text-lg text-white/90 mb-6 leading-relaxed font-light">
                ひとつひとつ丁寧に仕上げる手仕事。<br/>
                機械では表現できない繊細さと、苔への愛情が込められた唯一無二の作品です。<br/>
                自然と調和するように、手のぬくもりを大切にしています。
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
                札幌から広がる、苔の癒しの輪
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed font-light">
                Moss Countryは札幌を拠点に、まずは北海道各地へ、<br/>
                そしていずれは全国へと苔の癒しを届けていきます。<br/>
                苔の美しさや魅力を通じて、心にやすらぎと自然への優しさを育む文化を広げていきたいと考えています。
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