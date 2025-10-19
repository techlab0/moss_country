'use client';

import { getMossSpecies, urlFor } from '@/lib/sanity'
import type { MossSpecies } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function MossGuidePage() {
  const [mossSpecies, setMossSpecies] = useState<MossSpecies[]>([])
  const [filteredSpecies, setFilteredSpecies] = useState<MossSpecies[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  // 苔データを取得
  useEffect(() => {
    const fetchMossSpecies = async () => {
      try {
        const fetchedSpecies = await getMossSpecies()
        setMossSpecies(fetchedSpecies)
        setFilteredSpecies(fetchedSpecies)
        
        // カテゴリー一覧を作成
        const uniqueCategories = Array.from(
          new Set(fetchedSpecies.map(species => species.category).filter(Boolean))
        )
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('苔図鑑データの取得に失敗しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMossSpecies()
  }, [])

  // 検索・フィルター機能
  useEffect(() => {
    let filtered = mossSpecies

    // カテゴリーフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(species => species.category === selectedCategory)
    }

    // 難易度フィルター
    if (selectedDifficulty !== 'all') {
      const difficulty = parseInt(selectedDifficulty)
      filtered = filtered.filter(species => species.characteristics.beginnerFriendly === difficulty)
    }

  
    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(species =>
        species.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        species.commonNames?.some(name => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        species.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredSpecies(filtered)
  }, [mossSpecies, searchTerm, selectedCategory, selectedDifficulty])

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
          case 'low': return '低（週1-2回）'
          case 'medium': return '中（週2-3回）'
          case 'high': return '高（毎日〜隔日）'
          default: return value
        }
      case 'lightRequirement':
        switch (value) {
          case 'weak': return '弱光'
          case 'medium': return '中光'
          case 'strong': return '強光'
          default: return value
        }
      case 'temperatureAdaptability':
        switch (value) {
          case 'cold': return '寒冷向け'
          case 'temperate': return '温帯向け'
          case 'warm': return '高温向け'
          default: return value
        }
      case 'growthSpeed':
        switch (value) {
          case 'slow': return '遅'
          case 'normal': return '普通'
          case 'fast': return '早'
          default: return value
        }
      default:
        return value
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
              苔図鑑
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              北海道の苔テラリウム専門店が厳選した、テラリウムに最適な苔の種類をご紹介。
              育て方のコツや特性を詳しく解説します。
            </p>
            
            {/* 検索・フィルター */}
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 検索窓 */}
                <div className="lg:col-span-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="苔の名前で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-moss-green focus:border-transparent text-gray-700 placeholder-gray-400"
                  />
                </div>
                
                {/* カテゴリーフィルター */}
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full py-3 px-4 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-moss-green focus:border-transparent text-gray-700"
                  >
                    <option value="all">全ての分類</option>
                    <option value="moss">蘚類</option>
                    <option value="liverwort">苔類</option>
                    <option value="hornwort">ツノゴケ類</option>
                  </select>
                </div>

                {/* 難易度フィルター */}
                <div>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="block w-full py-3 px-4 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-moss-green focus:border-transparent text-gray-700"
                  >
                    <option value="all">全ての難易度</option>
                    <option value="5">★★★★★ とても簡単</option>
                    <option value="4">★★★★☆ 簡単</option>
                    <option value="3">★★★☆☆ 普通</option>
                    <option value="2">★★☆☆☆ 難しい</option>
                    <option value="1">★☆☆☆☆ とても難しい</option>
                  </select>
                </div>
              </div>

              
              {/* 検索結果数表示 */}
              <div className="text-sm text-gray-800">
                {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' ? (
                  <span>{filteredSpecies.length}種類の苔が見つかりました</span>
                ) : (
                  <span>全{mossSpecies.length}種類の苔</span>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="py-8">
        <Container>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-moss-green bg-white">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-moss-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                苔図鑑を読み込み中...
              </div>
            </div>
          ) : filteredSpecies.length === 0 ? (
            <div className="text-center py-12">
              {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' ? (
                <div className="space-y-4">
                  <p className="text-gray-800 text-lg">検索条件に一致する苔が見つかりませんでした。</p>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('all')
                      setSelectedDifficulty('all')
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-moss-green bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    検索条件をリセット
                  </button>
                </div>
              ) : (
                <p className="text-gray-800 text-lg">現在苔図鑑データがありません。</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {filteredSpecies.map((species) => {
                console.log('Species data:', { name: species.name, slug: species.slug, _id: species._id });
                return (
                <Link key={species._id} href={`/moss-guide/${species.slug?.current || 'no-slug'}`} className="block group">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden bg-white/80 backdrop-blur-sm">
                    {/* 画像部分 */}
                    <div className="w-full h-64 overflow-hidden relative">
                      {species.images && species.images[0] ? (
                        <Image
                          src={urlFor(species.images[0]).width(400).height(400).url()}
                          alt={species.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <ImagePlaceholder
                          src=""
                          alt={species.name}
                          width={256}
                          height={256}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      
                      {/* オーバーレイバッジ */}
                      <div className="absolute top-3 left-3 space-y-2">
                        <span className="bg-moss-green text-white px-2 py-1 rounded-full text-xs font-medium">
                          {getCategoryName(species.category)}
                        </span>
                        {species.featured && (
                          <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium block">
                            おすすめ
                          </span>
                        )}
                        {species.practicalAdvice?.workshopUsage && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium block">
                            WS使用
                          </span>
                        )}
                      </div>
                      
                      {/* 初心者適応度 */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <span className="text-xs font-medium text-amber-600">
                          {renderStars(species.characteristics.beginnerFriendly)}
                        </span>
                      </div>
                    </div>
                    
                    {/* コンテンツ部分 */}
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* タイトル */}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-moss-green transition-colors line-clamp-1">
                            {species.name}
                          </h3>
                        </div>
                        
                        {/* 特性 */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">水分:</span>
                            <span className="font-medium text-gray-900">{getCharacteristicLabel('waterRequirement', species.characteristics.waterRequirement)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">光量:</span>
                            <span className="font-medium text-gray-900">{getCharacteristicLabel('lightRequirement', species.characteristics.lightRequirement)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">温度:</span>
                            <span className="font-medium text-gray-900">{getCharacteristicLabel('temperatureAdaptability', species.characteristics.temperatureAdaptability)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">成長:</span>
                            <span className="font-medium text-gray-900">{getCharacteristicLabel('growthSpeed', species.characteristics.growthSpeed)}</span>
                          </div>
                        </div>
                        
                        {/* バッジ表示 */}
                        <div className="flex flex-wrap gap-1">
                          {species.characteristics?.beginnerFriendly >= 4 && (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs">✅ 初心者向け</span>
                          )}
                        </div>
                        
                        {/* フッター */}
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-moss-green text-sm font-semibold group-hover:underline flex items-center">
                            詳しく見る
                            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )})}
            </div>
          )}
        </Container>
      </div>
    </div>
  )
}