'use client';

import { getMossSpeciesBySlug, urlFor } from '@/lib/sanity'
import type { MossSpecies } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { Card, CardContent } from '@/components/ui/Card'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, use } from 'react'
import { notFound } from 'next/navigation'
import { PortableText } from '@portabletext/react'

interface MossGuideDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function MossGuideDetailPage({ params }: MossGuideDetailPageProps) {
  const resolvedParams = use(params)
  const [species, setSpecies] = useState<MossSpecies | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // 画面サイズを監視してモバイルかどうかを判定
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        const fetchedSpecies = await getMossSpeciesBySlug(resolvedParams.slug)
        if (!fetchedSpecies) {
          notFound()
          return
        }
        setSpecies(fetchedSpecies)
      } catch (error) {
        console.error('苔データの取得に失敗しました:', error)
        notFound()
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpecies()
  }, [resolvedParams.slug])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-moss-green bg-white">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-moss-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          読み込み中...
        </div>
      </div>
    )
  }

  if (!species) {
    return notFound()
  }

  // 星評価の表示
  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  // カテゴリー日本語名
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'moss': return '蘚類'
      case 'liverwort': return '苔類'
      case 'hornwort': return 'ツノゴケ類'
      default: return category
    }
  }

  // 育成特性のラベル
  const getCharacteristicLabel = (type: string, value: string | number) => {
    switch (type) {
      case 'waterRequirement':
        switch (value) {
          case 'low': return '低 - 週1-2回の霧吹き'
          case 'medium': return '中 - 週2-3回の霧吹き'
          case 'high': return '高 - 毎日〜隔日の霧吹き'
          default: return value
        }
      case 'lightRequirement':
        switch (value) {
          case 'weak': return '弱光 - 間接光・LED弱設定'
          case 'medium': return '中光 - 明るい室内・LED中設定'
          case 'strong': return '強光 - 直射日光可・LED強設定'
          default: return value
        }
      case 'temperatureAdaptability':
        switch (value) {
          case 'cold': return '寒冷向け - 5-15℃が最適'
          case 'temperate': return '温帯向け - 15-25℃が最適'
          case 'warm': return '高温向け - 25℃以上でも適応'
          default: return value
        }
      case 'growthSpeed':
        switch (value) {
          case 'slow': return '遅 - 年数回のメンテナンス'
          case 'normal': return '普通 - 月1回程度のメンテナンス'
          case 'fast': return '早 - 週1回程度のメンテナンス'
          default: return value
        }
      default:
        return value
    }
  }

  // 季節の日本語表示
  const getSeasonName = (season: string) => {
    switch (season) {
      case 'spring': return '春（3-5月）'
      case 'summer': return '夏（6-8月）'
      case 'autumn': return '秋（9-11月）'
      case 'winter': return '冬（12-2月）'
      default: return season
    }
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: isMobile 
          ? `url('/images/misc/moss02_sp.png')` 
          : `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        filter: isMobile ? 'brightness(1.2)' : 'none'
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-white/80" />
      
      <div className="relative z-10">
        {/* Navigation */}
        <div className="py-4 border-b border-emerald-100 bg-white/90 backdrop-blur-sm">
          <Container>
            <div className="flex items-center text-sm text-gray-600">
              <Link href="/" className="hover:text-moss-green transition-colors">ホーム</Link>
              <span className="mx-2">/</span>
              <Link href="/moss-guide" className="hover:text-moss-green transition-colors">苔図鑑</Link>
              <span className="mx-2">/</span>
              <span className="text-moss-green font-medium">{species.name}</span>
            </div>
          </Container>
        </div>

        {/* Main Content */}
        <div className="py-8">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {/* 画像ギャラリー */}
              <div className="space-y-4">
                {/* メイン画像 */}
                <div className="aspect-square overflow-hidden rounded-lg bg-white shadow-lg">
                  {species.images && species.images[selectedImageIndex] ? (
                    <Image
                      src={urlFor(species.images[selectedImageIndex]).width(600).height(600).url()}
                      alt={species.images[selectedImageIndex].caption || species.name}
                      width={600}
                      height={600}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder
                      src=""
                      alt={species.name}
                      width={600}
                      height={600}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                {/* サムネイル */}
                {species.images && species.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {species.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          selectedImageIndex === index
                            ? 'border-moss-green ring-2 ring-moss-green ring-offset-2'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Image
                          src={urlFor(image).width(150).height(150).url()}
                          alt={image.caption || `${species.name} ${index + 1}`}
                          width={150}
                          height={150}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* 画像キャプション */}
                {species.images && species.images[selectedImageIndex]?.caption && (
                  <p className="text-sm text-gray-600 text-center bg-white/90 backdrop-blur-sm p-3 rounded-lg">
                    {species.images[selectedImageIndex].caption}
                  </p>
                )}
              </div>

              {/* 詳細情報 */}
              <div className="space-y-6">
                {/* ヘッダー */}
                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{species.name}</h1>
                      {species.commonNames && species.commonNames.length > 0 && (
                        <p className="text-sm text-gray-500">
                          別名: {species.commonNames.join('、')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className="bg-moss-green text-white px-3 py-1 rounded-full text-sm font-medium">
                        {getCategoryName(species.category)}
                      </span>
                      {species.featured && (
                        <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          おすすめ
                        </span>
                      )}
                      {species.practicalAdvice?.workshopUsage && (
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          ワークショップ使用
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* タグ */}
                  {species.tags && species.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {species.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 育成特性 */}
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      特性
                    </h2>
                    <div className="space-y-4">
                      {/* 初心者適応度 */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
                        <span className="font-medium text-gray-700">育てやすさ</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-600">
                            {renderStars(species.characteristics.beginnerFriendly)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {species.characteristics.beginnerFriendly === 5 ? 'とても育てやすい' :
                             species.characteristics.beginnerFriendly === 4 ? '育てやすい' :
                             species.characteristics.beginnerFriendly === 3 ? '普通' :
                             species.characteristics.beginnerFriendly === 2 ? '難しい' : 'とても難しい'}
                          </div>
                        </div>
                      </div>
                      
                      {/* その他の特性 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            水やり
                          </div>
                          <div className="text-sm text-blue-700 font-medium">
                            {getCharacteristicLabel('waterRequirement', species.characteristics.waterRequirement)}
                          </div>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            光量
                          </div>
                          <div className="text-sm text-yellow-700 font-medium">
                            {getCharacteristicLabel('lightRequirement', species.characteristics.lightRequirement)}
                          </div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            温度
                          </div>
                          <div className="text-sm text-red-700 font-medium">
                            {getCharacteristicLabel('temperatureAdaptability', species.characteristics.temperatureAdaptability)}
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            メンテナンス
                          </div>
                          <div className="text-sm text-green-700 font-medium">
                            {getCharacteristicLabel('growthSpeed', species.characteristics.growthSpeed)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* 詳細説明 */}
            <div className="mt-8 max-w-7xl mx-auto space-y-6">
              {/* 基本情報 - descriptionまたはbasicInfoがある場合のみ表示 */}
              {(species.description || (species.basicInfo && typeof species.basicInfo === 'string' && species.basicInfo.trim())) && (
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">基本情報</h2>
                    {species.description && (
                      <div className="prose prose-lg max-w-none text-gray-700">
                        <PortableText 
                          value={species.description}
                          components={{
                            block: {
                              h2: ({children}) => <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">{children}</h2>,
                              h3: ({children}) => <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>,
                              normal: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
                            },
                            list: {
                              bullet: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                              number: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                            },
                            marks: {
                              strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                            },
                          }}
                        />
                      </div>
                    )}
                    
                    {/* 追加の基本情報 */}
                    {species.basicInfo && typeof species.basicInfo === 'string' && species.basicInfo.trim() && (
                      <div className={species.description ? "mt-6" : ""}>
                        <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-emerald-50 p-4 rounded-lg">
                          {species.basicInfo}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 補足情報 - 内容がある場合のみ表示 */}
              {species.supplementaryInfo && typeof species.supplementaryInfo === 'string' && species.supplementaryInfo.trim() && (
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      補足情報
                    </h2>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {species.supplementaryInfo}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 育て方 - 内容がある場合のみ表示 */}
              {species.practicalAdvice && (
                (species.practicalAdvice.successTips && species.practicalAdvice.successTips.length > 0 && species.practicalAdvice.successTips.some(tip => tip.trim())) ||
                (species.practicalAdvice.difficultyPoints && species.practicalAdvice.difficultyPoints.length > 0 && species.practicalAdvice.difficultyPoints.some(point => point.trim())) ||
                (species.practicalAdvice.careInstructions && species.practicalAdvice.careInstructions.trim())
              ) && (
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      育て方
                    </h2>
                    <div className="space-y-6">
                      {/* 成功のコツ */}
                      {species.practicalAdvice.successTips && species.practicalAdvice.successTips.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-emerald-800 mb-3">
                            育て方のコツ
                          </h3>
                          <ul className="space-y-2">
                            {species.practicalAdvice.successTips.map((tip, index) => (
                              <li key={index} className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3"></span>
                                <span className="text-gray-700">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* よくある失敗 */}
                      {species.practicalAdvice.difficultyPoints && species.practicalAdvice.difficultyPoints.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-red-800 mb-3">
                            よくある失敗・注意点
                          </h3>
                          <ul className="space-y-2">
                            {species.practicalAdvice.difficultyPoints.map((point, index) => (
                              <li key={index} className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2 mr-3"></span>
                                <span className="text-gray-700">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 詳しい育て方 */}
                      {species.practicalAdvice.careInstructions && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">
                            育て方補足
                          </h3>
                          <div className="text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed whitespace-pre-line">
                            {species.practicalAdvice.careInstructions}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 戻るボタン */}
            <div className="mt-8 text-center">
              <Link
                href="/moss-guide"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-moss-green hover:bg-emerald-700 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                一覧に戻る
              </Link>
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}