'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { SquarePaymentForm } from '@/components/ui/SquarePaymentForm';
import { getSimpleWorkshops } from '@/lib/sanity';
import { CAPACITY_PER_SLOT } from '@/lib/workshopBookingConfig';
import type { SimpleWorkshop } from '@/types/sanity';

// 既存のワークショップページ（src/app/workshop/page.tsx）と同じ問い合わせ導線を流用する
const JALAN_URL =
  'https://www.jalan.net/kankou/spt_guide000000228974/?msockid=3e4b092db2b0692107f61de6b3b568a6';
const CONTACT_MAILTO = 'mailto:info@mosscountry.jp?subject=ワークショップ予約について';

interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
}

interface BookingResult {
  bookingNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  total: number;
  paymentMethod: 'credit_card' | 'on_site' | 'paypay';
  paymentStatus: 'pending' | 'paid';
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: 'プラン選択',
  2: '日時選択',
  3: '人数',
  4: 'お客様情報',
  5: 'お支払い',
};

function formatDateJP(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekday})`;
}

// カレンダー・予約システムに一時的に接続できない場合の共通案内（じゃらん／問い合わせへ誘導）
function UnavailableNotice({ message }: { message: string }) {
  return (
    <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-6">
      <p className="text-amber-200 font-medium mb-4">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="secondary"
          size="sm"
          className="border-white text-white hover:bg-white hover:text-stone-900"
          onClick={() => window.open(JALAN_URL, '_blank')}
        >
          じゃらんで予約する
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-white border border-white/40 hover:bg-white/10"
          onClick={() => (window.location.href = CONTACT_MAILTO)}
        >
          お問い合わせフォーム
        </Button>
      </div>
    </div>
  );
}

export default function WorkshopBookingPage() {
  const [step, setStep] = useState<Step>(1);

  // ---- 1. プラン選択 ----
  const [plans, setPlans] = useState<SimpleWorkshop[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SimpleWorkshop | null>(null);

  useEffect(() => {
    let mounted = true;
    getSimpleWorkshops()
      .then((data) => {
        if (mounted) setPlans(data);
      })
      .finally(() => {
        if (mounted) setPlansLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ---- 2. 日時選択 ----
  const [availability, setAvailability] = useState<AvailableSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityUnavailable, setAvailabilityUnavailable] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  useEffect(() => {
    if (!selectedPlan) return;

    let mounted = true;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    setAvailabilityUnavailable(false);

    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    const to = maxDate.toISOString().slice(0, 10);

    fetch(
      `/api/workshop/availability?from=${from}&to=${to}&planId=${encodeURIComponent(selectedPlan._id)}`
    )
      .then(async (res) => {
        if (!mounted) return;
        if (res.status === 503) {
          setAvailabilityUnavailable(true);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAvailabilityError(data.error || '空き状況の取得に失敗しました');
          return;
        }
        setAvailability(data.available || []);
      })
      .catch(() => {
        if (mounted) setAvailabilityError('空き状況の取得に失敗しました。通信環境をご確認のうえ再度お試しください。');
      })
      .finally(() => {
        if (mounted) setAvailabilityLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedPlan]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const slot of availability) {
      const list = map.get(slot.date) || [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return Array.from(map.entries());
  }, [availability]);

  // ---- 3. 人数 ----
  const [partySize, setPartySize] = useState(1);
  const maxPartySize = selectedSlot ? Math.min(CAPACITY_PER_SLOT, selectedSlot.remaining) : CAPACITY_PER_SLOT;

  // ---- 4. お客様情報 ----
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customerError, setCustomerError] = useState<string | null>(null);

  // ---- 5. お支払い ----
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'on_site'>('on_site');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitUnavailable, setSubmitUnavailable] = useState(false);

  // ---- 完了 ----
  const [result, setResult] = useState<BookingResult | null>(null);

  const total = selectedPlan?.price ? selectedPlan.price * partySize : 0;

  const squareApplicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'main';

  const handleSelectPlan = (plan: SimpleWorkshop) => {
    setSelectedPlan(plan);
    setSelectedSlot(null);
    setAvailability([]);
    setStep(2);
  };

  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setPartySize(1);
    setStep(3);
  };

  const handlePartyNext = () => {
    setStep(4);
  };

  const handleCustomerNext = () => {
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setCustomerError('氏名・メールアドレス・電話番号をすべてご入力ください');
      return;
    }
    setCustomerError(null);
    setStep(5);
  };

  async function submitBooking(paymentToken?: { token: string }) {
    if (!selectedPlan || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitUnavailable(false);

    try {
      const res = await fetch('/api/workshop/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan._id,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          partySize,
          customer: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
          },
          paymentMethod,
          notes: notes.trim() || undefined,
          ...(paymentToken ? { paymentToken } : {}),
        }),
      });

      if (res.status === 503) {
        setSubmitUnavailable(true);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data.error || data.message || '予約処理に失敗しました');
        return;
      }

      setResult(data as BookingResult);
    } catch {
      setSubmitError('通信エラーが発生しました。しばらくしてから再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  const handleSquareError = (error: Error) => {
    setSubmitError(error.message || '決済処理中にエラーが発生しました。カード情報を確認して再度お試しください。');
  };

  // ---- 完了画面 ----
  if (result) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20">
        <Container>
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-white mb-4">ご予約を承りました</h1>
            <p className="text-stone-300 mb-8">確認メールをお送りしましたのでご確認ください。</p>

            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 text-left space-y-3">
              <div className="flex justify-between text-stone-300 text-sm">
                <span>予約番号</span>
                <span className="text-white font-medium">{result.bookingNumber}</span>
              </div>
              <div className="flex justify-between text-stone-300 text-sm">
                <span>プラン</span>
                <span className="text-white font-medium">{selectedPlan?.title}</span>
              </div>
              <div className="flex justify-between text-stone-300 text-sm">
                <span>日時</span>
                <span className="text-white font-medium">
                  {formatDateJP(result.date)} {result.startTime}〜{result.endTime}
                </span>
              </div>
              <div className="flex justify-between text-stone-300 text-sm">
                <span>人数</span>
                <span className="text-white font-medium">{result.partySize}名</span>
              </div>
              <div className="flex justify-between text-stone-300 text-sm border-t border-stone-800 pt-3">
                <span>金額</span>
                <span className="text-white font-bold text-lg">¥{result.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-300 text-sm">
                <span>お支払い方法</span>
                <span className="text-white font-medium">
                  {result.paymentMethod === 'credit_card'
                    ? result.paymentStatus === 'paid'
                      ? 'クレジットカード（決済完了）'
                      : 'クレジットカード（決済処理中）'
                    : '現地精算（当日店頭でお支払いください）'}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/workshop">
                <Button variant="primary" size="lg">
                  ワークショップページに戻る
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-stone-950 min-h-screen pt-20">
      <Container>
        <div className="py-8 max-w-3xl mx-auto">
          <div className="border-b border-stone-800 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-white">ワークショップ予約</h1>
            <p className="text-stone-400 mt-2 text-sm">
              ステップ {step} / 5 ・ {STEP_LABELS[step]}
            </p>
          </div>

          {/* ステップ1: プラン選択 */}
          {step === 1 && (
            <div className="space-y-4">
              {plansLoading ? (
                <div className="text-stone-400 text-center py-12">読み込み中...</div>
              ) : plans.length === 0 ? (
                <UnavailableNotice message="現在ご案内できるプランがありません。恐れ入りますが、下記よりお問い合わせください。" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <button
                      key={plan._id}
                      onClick={() => handleSelectPlan(plan)}
                      className="text-left bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800 hover:border-emerald-500 transition-colors"
                    >
                      <h3 className="text-lg font-medium text-white mb-2">{plan.title}</h3>
                      <p className="text-stone-400 text-sm mb-4 whitespace-pre-line line-clamp-3">
                        {plan.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-400">{plan.duration || '-'}</span>
                        <span className="text-emerald-400 font-bold text-lg">
                          {plan.price ? `¥${plan.price.toLocaleString()}` : 'お問い合わせください'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ステップ2: 日時選択 */}
          {step === 2 && selectedPlan && (
            <div className="space-y-6">
              <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800 flex items-center justify-between">
                <div>
                  <p className="text-stone-400 text-xs">選択中のプラン</p>
                  <p className="text-white font-medium">{selectedPlan.title}</p>
                </div>
                <button className="text-emerald-400 text-sm hover:underline" onClick={() => setStep(1)}>
                  変更する
                </button>
              </div>

              {availabilityLoading ? (
                <div className="text-stone-400 text-center py-12">空き状況を確認しています...</div>
              ) : availabilityUnavailable ? (
                <UnavailableNotice message="ただいまオンライン予約を受け付けできません。お問い合わせください。" />
              ) : availabilityError ? (
                <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-6 text-red-200">
                  {availabilityError}
                </div>
              ) : groupedByDate.length === 0 ? (
                <UnavailableNotice message="現在ご案内できる空き枠がありません。恐れ入りますが、下記よりお問い合わせください。" />
              ) : (
                <>
                  <p className="text-stone-500 text-xs">※ご予約は開始時刻の24時間前までとなります</p>
                  <div className="max-h-[28rem] overflow-y-auto space-y-3 pr-1">
                    {groupedByDate.map(([date, slots]) => (
                      <div key={date} className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                        <p className="text-white font-medium mb-3">{formatDateJP(date)}</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <button
                              key={`${slot.date}-${slot.startTime}`}
                              onClick={() => handleSelectSlot(slot)}
                              className="px-4 py-2 rounded-lg border border-stone-700 text-white hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors text-sm"
                            >
                              {slot.startTime}〜{slot.endTime}
                              <span className="ml-2 text-stone-400">残り{slot.remaining}名</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div>
                <Button variant="ghost" size="sm" className="text-stone-300" onClick={() => setStep(1)}>
                  ← 戻る
                </Button>
              </div>
            </div>
          )}

          {/* ステップ3: 人数 */}
          {step === 3 && selectedPlan && selectedSlot && (
            <div className="space-y-6">
              <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                <p className="text-stone-400 text-xs">選択中の日時</p>
                <p className="text-white font-medium">
                  {formatDateJP(selectedSlot.date)} {selectedSlot.startTime}〜{selectedSlot.endTime}
                </p>
              </div>

              <div className="bg-stone-900/50 rounded-2xl p-6 border border-stone-800">
                <label className="block text-stone-300 text-sm font-medium mb-2">
                  参加人数（最大{maxPartySize}名）
                </label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  {Array.from({ length: maxPartySize }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}名
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" size="md" className="text-stone-300" onClick={() => setStep(2)}>
                  ← 戻る
                </Button>
                <Button variant="primary" size="md" onClick={handlePartyNext}>
                  次へ
                </Button>
              </div>
            </div>
          )}

          {/* ステップ4: お客様情報 */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800 space-y-4">
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-2">
                    お名前 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-2">
                    メールアドレス <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-2">
                    電話番号 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-2">備考（任意）</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                    placeholder="ご要望等がございましたらご記入ください"
                  />
                </div>

                {customerError && <p className="text-red-400 text-sm">{customerError}</p>}
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" size="md" className="text-stone-300" onClick={() => setStep(3)}>
                  ← 戻る
                </Button>
                <Button variant="primary" size="md" onClick={handleCustomerNext}>
                  次へ
                </Button>
              </div>
            </div>
          )}

          {/* ステップ5: 支払い方法・確認 */}
          {step === 5 && selectedPlan && selectedSlot && (
            <div className="space-y-6">
              <div className="bg-stone-900/50 rounded-2xl p-6 border border-stone-800 space-y-2">
                <h2 className="text-white font-medium mb-2">ご予約内容の確認</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">プラン</span>
                  <span className="text-white">{selectedPlan.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">日時</span>
                  <span className="text-white">
                    {formatDateJP(selectedSlot.date)} {selectedSlot.startTime}〜{selectedSlot.endTime}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">人数</span>
                  <span className="text-white">{partySize}名</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">お名前</span>
                  <span className="text-white">{customerName}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-stone-800 pt-2 mt-2">
                  <span className="text-stone-300 font-medium">合計金額</span>
                  <span className="text-emerald-400 font-bold text-lg">¥{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                <h2 className="text-white font-medium mb-4">お支払い方法</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-stone-700 rounded-lg cursor-pointer hover:border-stone-600 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'on_site'}
                      onChange={() => setPaymentMethod('on_site')}
                      className="text-emerald-500"
                    />
                    <div>
                      <p className="text-white font-medium">現地払い</p>
                      <p className="text-stone-400 text-xs">当日、店頭にてお支払いください</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-stone-700 rounded-lg cursor-pointer hover:border-stone-600 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'credit_card'}
                      onChange={() => setPaymentMethod('credit_card')}
                      className="text-emerald-500"
                    />
                    <div>
                      <p className="text-white font-medium">クレジットカード</p>
                      <p className="text-stone-400 text-xs">オンラインで事前決済します</p>
                    </div>
                  </label>
                </div>
              </div>

              {submitUnavailable && (
                <UnavailableNotice message="ただいまオンライン予約を受け付けできません。お問い合わせください。" />
              )}

              {submitError && (
                <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-red-200 text-sm">
                  {submitError}
                </div>
              )}

              {paymentMethod === 'credit_card' ? (
                squareApplicationId ? (
                  <SquarePaymentForm
                    applicationId={squareApplicationId}
                    locationId={squareLocationId}
                    amount={total}
                    disabled={submitting}
                    onPaymentSuccess={async (paymentResult) => {
                      await submitBooking({ token: paymentResult.token });
                    }}
                    onPaymentError={handleSquareError}
                  />
                ) : (
                  <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-red-200 text-sm">
                    クレジットカード決済の設定が不完全です。現地払いをご利用いただくか、お問い合わせください。
                  </div>
                )
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                  onClick={() => submitBooking()}
                >
                  {submitting ? '送信中...' : 'この内容で予約を確定する'}
                </Button>
              )}

              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-stone-300"
                  disabled={submitting}
                  onClick={() => setStep(4)}
                >
                  ← 戻る
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
