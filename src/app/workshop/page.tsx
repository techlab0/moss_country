'use client';
import React, { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
<<<<<<< HEAD
import { getWorkshops, getSimpleWorkshops, urlFor } from '@/lib/sanity';
import { workshopImages } from '@/lib/imageUtils';
=======
import { getSimpleWorkshops } from '@/lib/sanity';
import { workshopImages } from '@/lib/imageUtils';
import type { SimpleWorkshop } from '@/types/sanity';
>>>>>>> clean-main

const courses = [
  {
    id: 'basic-course',
    name: '基礎コース',
    subtitle: '初めてでも安心',
    duration: '90分',
    price: '¥4,800',
    capacity: '6名',
    difficulty: '初心者向け',
    description: 'テラリウムの基本を学びながら、小さなカプセルテラリウムを制作します。必要な道具・材料はすべて込み。',
    includes: ['基本テラリウム制作', '必要道具一式', 'お手入れガイド', 'アフターサポート'],
    target: 'テラリウム初心者、手作り体験をしたい方',
    image: 'from-light-green to-moss-green',
  },
  {
    id: 'advanced-course',
    name: '応用コース',
    subtitle: 'もっと深く学ぼう',
    duration: '120分',
    price: '¥7,200',
    capacity: '4名',
    difficulty: '中級者向け',
    description: '様々な苔や植物を使って、より複雑で美しいテラリウムを制作。デザインテクニックも学べます。',
    includes: ['応用テラリウム制作', '高級素材使用', 'デザイン指導', '専用ツール体験'],
    target: '基礎コース修了者、より本格的に学びたい方',
    image: 'from-moss-green to-warm-brown',
  },
  {
    id: 'family-course',
    name: '親子コース',
    subtitle: '家族で楽しむ自然の時間',
    duration: '100分',
    price: '¥6,000',
    capacity: '5組',
    difficulty: '親子向け',
    description: '小学生以上のお子様と保護者の方が一緒に楽しめるコース。親子でそれぞれ1つずつ制作できます。',
    includes: ['親子ペア制作', '子供用道具', '記念撮影', 'お持ち帰り用袋'],
    target: '小学生以上のお子様がいるご家族',
    image: 'from-beige to-light-green',
  },
  {
    id: 'premium-course',
    name: 'プレミアム体験',
    subtitle: '職人技を間近で',
    duration: '150分',
    price: '¥12,000',
    capacity: '3名',
    difficulty: '上級者向け',
    description: '職人と同じ技術と材料を使った本格制作体験。大型テラリウムやアート作品レベルの制作に挑戦。',
    includes: ['プレミアム素材', '職人直接指導', '特製ツール使用', '作品証明書'],
    target: 'テラリウム経験者、職人技術を学びたい方',
    image: 'from-warm-brown to-moss-green',
  },
];

const schedule = [
  { day: '火曜日', time: '14:00-15:30', course: '基礎コース' },
  { day: '水曜日', time: '10:00-12:00', course: '応用コース' },
  { day: '木曜日', time: '14:00-15:30', course: '基礎コース' },
  { day: '土曜日', time: '10:00-11:40', course: '親子コース' },
  { day: '土曜日', time: '14:00-16:30', course: 'プレミアム体験' },
  { day: '日曜日', time: '10:00-11:30', course: '基礎コース' },
  { day: '日曜日', time: '14:00-16:00', course: '応用コース' },
];

const testimonials = [
  {
    name: '田中 美咲さん',
    age: '20代女性',
    course: '基礎コース',
    comment: '初めてのテラリウム作りでしたが、先生が丁寧に教えてくださって、とても楽しい時間でした。作った作品は今も大切に育てています。',
    rating: 5,
  },
  {
    name: '佐藤 恵子さん・太郎くん',
    age: '親子参加',
    course: '親子コース',
    comment: '8歳の息子と参加しました。子供でも分かりやすい説明で、親子で楽しく制作できました。息子は自分で作ったテラリウムをとても大切にしています。',
    rating: 5,
  },
  {
    name: '山田 健太さん',
    age: '30代男性',
    course: 'プレミアム体験',
    comment: '職人さんの技術を間近で見ることができて、とても勉強になりました。材料の選び方や配置のコツなど、プロの技術を学べる貴重な体験でした。',
    rating: 5,
  },
];

export default function WorkshopPage() {
<<<<<<< HEAD
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
=======
  const [workshops, setWorkshops] = useState<SimpleWorkshop[]>([]);
  const [, setLoading] = useState(true);
>>>>>>> clean-main

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
              自分の手で作る、特別なテラリウム体験
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              経験豊富な職人が丁寧に指導する、本格的なテラリウム制作体験。
              初心者の方でも安心して参加できるよう、基礎から応用まで幅広いコースをご用意しています。
            </p>
            <Button variant="primary" size="lg">
              今すぐ予約する
            </Button>
          </div>
        </Container>
      </section>

      {/* Course Options */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                コース紹介
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                あなたのレベルや目的に合わせて選べる4つのコース
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {courses.map((course) => (
              <Card key={course.id} className="hover:transform hover:scale-105 transition-all duration-300">
                <div className="h-48 overflow-hidden">
                  <ImagePlaceholder
                    src={workshopImages[course.id]?.src}
                    alt={workshopImages[course.id]?.alt || course.name}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                    fallbackGradient={course.image}
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm">
                      {course.difficulty}
                    </span>
                    <span className="text-moss-green font-bold text-xl">{course.price}</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-moss-green mb-1">{course.name}</h3>
                  <p className="text-gray-600 mb-3">{course.subtitle}</p>
                  <p className="text-gray-700 mb-4">{course.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-moss-green">時間</div>
                      <div className="text-gray-600">{course.duration}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-moss-green">定員</div>
                      <div className="text-gray-600">{course.capacity}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-moss-green">対象</div>
                      <div className="text-gray-600">{course.difficulty}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <h4 className="font-semibold text-moss-green mb-2">含まれるもの：</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {course.includes.map((item, index) => (
                        <li key={index} className="flex items-center">
                          <svg className="w-4 h-4 text-moss-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold text-moss-green mb-2">こんな方におすすめ：</h4>
                    <p className="text-sm text-gray-600">{course.target}</p>
                  </div>
                  <Button variant="primary" className="w-full">
                    このコースを予約する
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* CMS Workshop Section */}
      {workshops.length > 0 && (
        <section className="py-20">
          <Container>
            <div className="text-center mb-16">
              <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  最新のワークショップ
                </h2>
                <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
                <p className="text-lg text-gray-100">
                  季節に合わせた特別なワークショップをご用意しています
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
<<<<<<< HEAD
              {workshops.map((workshop: any) => (
=======
              {workshops.map((workshop: {_id: string, title: string, description: string, price?: number}) => (
>>>>>>> clean-main
                <Card key={workshop._id} className="bg-white shadow-lg">
                  <CardHeader>
                    <h3 className="text-xl font-bold text-moss-green mb-2">{workshop.title}</h3>
                    <p className="text-gray-600 mb-4">{workshop.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-moss-green">料金</div>
                        <div className="text-gray-600">¥{workshop.price?.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-moss-green">時間</div>
<<<<<<< HEAD
                        <div className="text-gray-600">{workshop.duration}</div>
=======
                        <div className="text-gray-600">{(workshop as SimpleWorkshop & { duration?: string }).duration || '90分'}</div>
>>>>>>> clean-main
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="primary" className="w-full">
                      予約する
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Schedule */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                開催スケジュール
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                毎週開催中！ご都合の良い日時をお選びください
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid gap-4">
              {schedule.map((slot, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                      <div className="w-16 h-16 bg-moss-green rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">{slot.day.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-moss-green text-lg">{slot.day}</div>
                        <div className="text-gray-600">{slot.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end space-x-4">
                      <span className="bg-light-green text-moss-green px-3 py-1 rounded-full text-sm font-medium">
                        {slot.course}
                      </span>
                      <Button variant="secondary" size="sm">
                        予約する
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <p className="text-white mb-4">
                ※スケジュールは変更になる場合があります。最新情報はお問い合わせください。
              </p>
              <Button variant="primary" size="lg">
                詳しいスケジュールを確認
              </Button>
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
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'コース選択', description: 'あなたに合ったコースを選んでください' },
                { step: '2', title: '日程確認', description: 'ご希望の日時をお選びください' },
                { step: '3', title: 'お申し込み', description: 'お問い合わせフォームからお申し込み' },
                { step: '4', title: '当日参加', description: '楽しいテラリウム作りを体験！' },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-moss-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-moss-green mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
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
              今すぐワークショップに参加しませんか？
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              職人の技術を間近で学びながら、世界に一つだけのテラリウムを作りましょう。
              初心者の方も安心してご参加いただけます。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'mailto:info@mosscountry.jp?subject=ワークショップ予約のお問い合わせ'}
              >
                ワークショップ予約
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'mailto:info@mosscountry.jp'}
              >
                詳しく問い合わせる
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}