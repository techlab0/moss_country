'use client';
import React, { useState, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';
import type { CalendarItem, CalendarData } from '@/types/calendar';

const storeInfo = {
  name: 'MOSS COUNTRY',
  address: '札幌市西区発寒11条4丁目3-1',
  phone: '080-3605-6340',
  email: 'moss.country.kokenokuni@gmail.com',
  hours: {
    regular: '11:00 - 20:00',
    closed: '不定休（カレンダーをご確認ください）',
  },
  /** 営業カレンダー下の注記（3行） */
  calendarNotes: [
    '営業時間: 11:00 - 20:00',
    'イベント出店日は店舗が営業していないことがあります',
    'ワークショップは予約優先制のため、ご来店前にお電話でご確認いただけますと確実です',
  ],
  parking: '近隣のコインパーキングをご利用ください',
  access: {
    subway: 'JR函館本線「発寒駅」より徒歩8分',
    bus: 'JRバス「発寒11条4丁目」停留所より徒歩1分',
    car: '新千歳空港より車で約50分',
  },
};

// その日の項目群からセルの配色を決める（営業＋イベント重複日は上下2色）。
function dayVisual(items: CalendarItem[] | undefined) {
  const hasOpen = items?.some((i) => i.type === 'open');
  const hasEvent = items?.some((i) => i.type === 'event');
  const hasClosed = items?.some((i) => i.type === 'closed');
  // 営業とイベントが重なる日は上半分を緑（営業）、下半分を黄（イベント）の2色で示す
  if (hasOpen && hasEvent) return { bg: 'bg-gradient-to-b from-emerald-200 from-50% to-amber-200 to-50%', text: 'text-emerald-900', border: 'border-emerald-400', hasEvent: true };
  if (hasOpen) return { bg: 'bg-emerald-200', text: 'text-emerald-900', border: 'border-emerald-400', hasEvent: !!hasEvent };
  if (hasEvent) return { bg: 'bg-amber-200', text: 'text-amber-900', border: 'border-amber-400', hasEvent: true };
  if (hasClosed) return { bg: 'bg-red-200', text: 'text-red-900', border: 'border-red-400', hasEvent: false };
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', hasEvent: false };
}

function itemTypeLabel(type: CalendarItem['type']) {
  return type === 'open' ? '営業日' : type === 'event' ? 'イベント出店' : '休業日';
}

// カレンダー表示用のヘルパー関数
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// カレンダーコンポーネント
function StoreCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState<{ dateLabel: string; dateStr: string; items: CalendarItem[] } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // カレンダーデータを取得（失敗時は空で表示）
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const response = await fetch('/api/admin/calendar');
        if (response.ok) {
          const data = await response.json();
          setCalendarEvents(data ?? {});
        }
      } catch {
        setCalendarEvents({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, []);
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  const prevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 2, 1);
    setCurrentDate(prev);
  };
  
  const nextMonth = () => {
    const next = new Date(currentYear, currentMonth, 1);
    setCurrentDate(next);
  };
  
  const renderCalendarDays = () => {
    const days = [];
    
    // 前月の空白日
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const items = calendarEvents[dateStr];
      const today = new Date();
      const isToday = today.getFullYear() === currentYear &&
                     today.getMonth() + 1 === currentMonth &&
                     today.getDate() === day;

      const vis = dayVisual(items);
      const bgColor = vis.bg;
      const textColor = vis.text;
      const borderColor = isToday ? 'border-moss-green border-2' : vis.border;

      const dateLabel = `${currentYear}年${currentMonth}月${day}日`;
      const hasItems = !!items && items.length > 0;
      // 詳細（場所・補足）がある、または項目が複数ある日はタップでモーダル
      const hasDetail = hasItems && (items!.length > 1 || items!.some((e) => e.location?.trim() || e.notes?.trim()));
      const primary = hasItems ? items![0] : null;

      const cellClass = `p-2 min-h-[60px] border ${borderColor} ${bgColor} ${textColor} text-sm rounded-lg relative hover:shadow-md transition-all duration-200 text-left w-full`;

      // スマホ: 数字 + 営/イ/休、イベント印📍、詳細/複数は≫
      if (isMobile) {
        const typeLabel = primary ? (primary.type === 'open' ? '営' : primary.type === 'event' ? 'イ' : '休') : null;
        days.push(
          hasItems ? (
            <button
              key={day}
              type="button"
              onClick={() => setModalEvent({ dateLabel, dateStr, items: items! })}
              className={`${cellClass} cursor-pointer flex flex-col items-center justify-start min-h-[44px] pt-1.5 pb-1 px-1`}
            >
              <span className="font-semibold text-sm leading-tight">{day}</span>
              <span className="text-xs font-medium leading-tight mt-0.5">{typeLabel}{vis.hasEvent && primary?.type !== 'event' ? '📍' : ''}</span>
              {hasDetail && <span className="text-xs opacity-80 mt-0.5">≫</span>}
            </button>
          ) : (
            <div key={day} className={`${cellClass} flex flex-col items-center justify-start min-h-[44px] pt-1.5 pb-1 px-1`}>
              <span className="font-semibold text-sm leading-tight">{day}</span>
            </div>
          )
        );
      } else {
        // PC: 代表タイトル + イベント印、詳細/複数の日は≫でモーダル
        days.push(
        hasItems ? (
          hasDetail ? (
            <button
              key={day}
              type="button"
              onClick={() => setModalEvent({ dateLabel, dateStr, items: items! })}
              className={`${cellClass} cursor-pointer`}
            >
              <div className="font-semibold mb-1 flex items-center justify-between">{day}{vis.hasEvent && <span title="イベントあり">📍</span>}</div>
              <div className="text-xs leading-tight flex items-end justify-between gap-1">
                <span className="font-medium line-clamp-2 flex-1 min-w-0">{primary!.title}{items!.length > 1 ? ` 他${items!.length - 1}件` : ''}</span>
                <span className="flex-shrink-0 opacity-70">≫</span>
              </div>
            </button>
          ) : (
            <div key={day} className={cellClass}>
              <div className="font-semibold mb-1 flex items-center justify-between">{day}{vis.hasEvent && <span title="イベントあり">📍</span>}</div>
              <div className="text-xs font-medium line-clamp-2">{primary!.title}</div>
            </div>
          )
        ) : (
          <div key={day} className={cellClass}>
            <div className="font-semibold">{day}</div>
          </div>
        )
      );
      }
    }
    
    return days;
  };
  
  if (isLoading) {
    return (
      <div className="bg-amber-950/50 md:bg-amber-950/20 backdrop-blur-md p-6 rounded-3xl">
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-white">カレンダーを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/50 md:bg-amber-950/20 backdrop-blur-md p-6 rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">
          {currentYear}年 {monthNames[currentMonth - 1]}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* カレンダー凡例 */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-emerald-200 border border-emerald-400 rounded mr-2"></div>
          <span className="text-white">営業日</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-amber-200 border border-amber-400 rounded mr-2"></div>
          <span className="text-white">イベント出店</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gradient-to-b from-emerald-200 from-50% to-amber-200 to-50% border border-emerald-400 rounded mr-2"></div>
          <span className="text-white">営業＋イベント</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-200 border border-red-400 rounded mr-2"></div>
          <span className="text-white">休業日</span>
        </div>
      </div>
      
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((dayName, index) => (
          <div
            key={dayName}
            className={`p-2 text-center font-semibold text-sm ${
              index === 0 ? 'text-red-300' : index === 6 ? 'text-blue-300' : 'text-white'
            }`}
          >
            {dayName}
          </div>
        ))}
      </div>
      
      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
      
      {/* 注意事項（storeInfo.calendarNotes で編集） */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          {storeInfo.calendarNotes.map((line, i) => (
            <span key={i}>
              {i > 0 ? <><strong>※</strong> {line}</> : <><strong>{line.split(':')[0]}:</strong> {line.split(':').slice(1).join(':').trim()}</>}
              {i < storeInfo.calendarNotes.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>

      {/* 日付詳細モーダル */}
      {modalEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 overflow-y-auto flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-4 min-w-0">
                <h3 id="calendar-modal-title" className="text-xl font-bold text-gray-900 break-words min-w-0 flex-1">
                  {modalEvent.dateLabel}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalEvent(null)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                  aria-label="閉じる"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {modalEvent.items.map((item, idx) => (
                  <div key={item.id ?? idx} className={idx > 0 ? 'pt-4 border-t border-gray-100' : ''}>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                      item.type === 'open' ? 'bg-emerald-100 text-emerald-800' :
                      item.type === 'event' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {itemTypeLabel(item.type)}
                    </span>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2 break-words min-w-0">{item.title}</h4>
                    {item.location && (
                      <p className="text-gray-600 mb-2 flex items-start gap-2 min-w-0">
                        <span className="flex-shrink-0">📍</span>
                        <span className="break-words min-w-0">{item.location}</span>
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-gray-600 whitespace-pre-wrap flex items-start gap-2 min-w-0 break-words">
                        <span className="flex-shrink-0">💭</span>
                        <span className="min-w-0 break-words">{item.notes}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalEvent(null)}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const serviceDetails: Record<number, string[]> = {
  0: ['初心者向けから上級者向けまで', '様々なサイズ・デザインをご用意', 'ギフト包装無料'],
  1: ['完全カスタマイズ対応', '制作期間：1-2週間', '事前相談無料'],
  2: ['植物の植え替え', '容器のクリーニング'],
  3: ['初心者から上級者まで', '材料・道具込み', '作品持ち帰り可'],
};
const serviceLinks: Record<number, string | undefined> = { 0: '/products', 3: '/workshop' };


interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

// FAQ表示用コンポーネント
function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await fetch('/api/admin/faqs');
        if (response.ok) {
          const data = await response.json();
          setFaqs(Array.isArray(data) ? data : []);
        } else {
          setFaqs([]);
        }
      } catch {
        setFaqs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center text-white">FAQを読み込み中...</div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center text-gray-300">
          現在FAQはありません。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {faqs.map((item, index) => (
        <Card key={index}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-moss-green flex items-start">
              <span className="bg-moss-green text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                Q
              </span>
              {item.question}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-start">
              <span className="bg-light-green text-moss-green rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                A
              </span>
              <p className="text-gray-700">{item.answer}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StorePage() {
  // 管理画面の「ページ編集」で保存された文言・画像を反映する（保存がなければ従来の文言）
  const { t, img } = usePageContent('store');
  const facilities = [1, 2].map(i => ({
    name: t(`facility${i}Name`),
    description: t(`facility${i}Desc`),
    image: img(`facility${i}Image`),
  }));
  const services = [1, 2, 3, 4].map(i => ({
    title: t(`service${i}Title`),
    description: t(`service${i}Desc`),
    price: t(`service${i}Price`),
    details: serviceDetails[i - 1],
    link: serviceLinks[i - 1],
  }));
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['store'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['store'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['store-mobile'].src);

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
    fetch(`/api/images/hero?page=store`)
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
    fetch(`/api/images/background?page=store&mobile=false`)
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
    fetch(`/api/images/background?page=store&mobile=true`)
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

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Unified Background Overlay */}
      <div className="absolute inset-0 pointer-events-none" />
      {/* Hero Section */}
      <section
        className="py-20 relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: `url('${heroImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Section Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {t('heroTitle')}
            </h1>
            <div className="w-24 h-1 bg-emerald-400 mx-auto mb-8"></div>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto mb-8 whitespace-pre-line">
              {t('heroLead')}
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
            <div className="bg-amber-950/20 backdrop-blur-md p-4 sm:p-8 rounded-3xl">
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">住所</h3>
                    <a
                      href="https://maps.app.goo.gl/zbnf4tynQAj2X5B98"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-200 break-all overflow-wrap-anywhere hover:text-white underline"
                    >
                      {storeInfo.address}
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">電話番号</h3>
                    <p className="text-gray-200 break-all overflow-wrap-anywhere">{storeInfo.phone}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">メールアドレス</h3>
                    <p className="text-gray-200 break-all overflow-wrap-anywhere">{storeInfo.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-moss-green rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">営業時間</h3>
                    <div className="text-gray-200 space-y-1">
                      <p className="break-all overflow-wrap-anywhere">営業時間: {storeInfo.hours.regular}</p>
                      <p className="text-yellow-300 break-all overflow-wrap-anywhere">{storeInfo.hours.closed}</p>
                      <p className="text-blue-300 text-sm break-all overflow-wrap-anywhere mt-2">
                        詳細は下記のカレンダーをご確認ください
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-amber-950/20 backdrop-blur-md p-4 sm:p-8 rounded-3xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">アクセスマップ</h2>
              <div className="h-64 rounded-lg overflow-hidden mb-6">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2913.5264158063487!2d141.29211759999998!3d43.0934509!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5f0b2967fe4c6bc9%3A0x5f6284f1ebb2447c!2zTW9zcyBDb3VudHJ544CQ6IuU44OG44Op44Oq44Km44Og5L2c5oiQ44O744Ov44O844Kv44K344On44OD44OX44CR!5e0!3m2!1sja!2sjp!4v1752175558799!5m2!1sja!2sjp"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="fullscreen"
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
                  <span className="text-gray-200 break-all overflow-wrap-anywhere text-sm sm:text-base">{storeInfo.access.subway}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                    </svg>
                  </span>
                  <span className="text-gray-200 break-all overflow-wrap-anywhere text-sm sm:text-base">{storeInfo.access.bus}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-gray-200 break-all overflow-wrap-anywhere text-sm sm:text-base">{storeInfo.access.car}</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Store Calendar */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                営業カレンダー
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                営業日・イベント出店・休業日をご確認いただけます
              </p>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <StoreCalendar />
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
                <div className="glass-card rounded-3xl overflow-hidden shadow-lg h-full flex flex-col">
                  <div className="relative overflow-hidden">
                    <img 
                      src={facility.image} 
                      alt={facility.name}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 bg-amber-950/20 backdrop-blur-md flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-3">{facility.name}</h3>
                    <p className="text-gray-100 text-lg leading-relaxed flex-1 drop-shadow-md">{facility.description}</p>
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
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="secondary"
                      className="cursor-pointer px-6 py-2"
                    onClick={() => {
                      window.location.href = service.link || '/contact';
                    }}
                  >
                      {service.link ? '詳細を見る' : '問い合わせる'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Store Gallery */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                店舗の様子
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                温かみのある空間で皆様をお迎えします
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src={img('galleryImage')}
                alt="店舗の様子"
                className="w-full h-auto object-cover"
              />
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

          <FAQSection />
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
                onClick={() => window.location.href = 'tel:080-3605-6340'}
              >
                お電話でお問い合わせ
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-moss-green transition-all duration-300 cursor-pointer font-semibold px-8 py-3"
                onClick={() => window.location.href = 'mailto:moss.country.kokenokuni@gmail.com'}
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