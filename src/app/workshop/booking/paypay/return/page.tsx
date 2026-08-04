'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

type VerifyState =
  | { phase: 'loading' }
  | { phase: 'paid'; total: number | null }
  | { phase: 'pending'; total: number | null }
  | { phase: 'failed'; total: number | null }
  | { phase: 'error'; message: string };

/**
 * ワークショップ予約のPayPay決済の戻りページ。
 * PayPayアプリでの決済完了/キャンセル後、PayPayがこのページへ `?booking=<予約番号>` 付きで
 * リダイレクトする。PayPayにはWebhookが無いため、ここから /api/workshop/paypay/verify を
 * 呼んで初めて支払い状態が確定する（EC注文の戻りページと同じ方式）。
 *
 * 予約自体はこのページに来る前に確定済みなので、支払いが完了しなかった場合も
 * 予約は「未入金」で残る（当日店頭での精算に切り替えられる）。
 */
function WorkshopPayPayReturnContent() {
  const searchParams = useSearchParams();
  const bookingNumber = searchParams.get('booking') || '';
  const [state, setState] = useState<VerifyState>({ phase: 'loading' });
  const [isRechecking, setIsRechecking] = useState(false);

  const verify = useCallback(async () => {
    if (!bookingNumber) {
      setState({ phase: 'error', message: '予約番号が指定されていません。' });
      return;
    }
    try {
      const response = await fetch(`/api/workshop/paypay/verify?booking=${encodeURIComponent(bookingNumber)}`, {
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setState({ phase: 'error', message: result.error || 'お支払い状況の確認に失敗しました。' });
        return;
      }

      if (result.status === 'paid') {
        setState({ phase: 'paid', total: result.total ?? null });
      } else if (result.status === 'failed') {
        setState({ phase: 'failed', total: result.total ?? null });
      } else {
        setState({ phase: 'pending', total: result.total ?? null });
      }
    } catch {
      setState({
        phase: 'error',
        message: 'お支払い状況の確認中にエラーが発生しました。通信環境をご確認のうえ、再度お試しください。',
      });
    }
  }, [bookingNumber]);

  useEffect(() => {
    verify();
  }, [verify]);

  const handleRecheck = async () => {
    setIsRechecking(true);
    setState({ phase: 'loading' });
    await verify();
    setIsRechecking(false);
  };

  return (
    <div className="bg-stone-950 min-h-screen pt-20">
      <Container className="py-16">
        <div className="max-w-2xl mx-auto text-center">
          {state.phase === 'loading' && (
            <div className="py-12">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-light text-white mb-2">お支払い状況を確認しています…</h1>
              <p className="text-stone-400 text-sm">このままお待ちください。画面を閉じないでください。</p>
            </div>
          )}

          {state.phase === 'paid' && (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">お支払いが完了しました</h1>
                <p className="text-lg text-stone-300">ご予約いただき、ありがとうございます。</p>
                {bookingNumber && <p className="text-stone-400 text-sm mt-2">予約番号: {bookingNumber}</p>}
                {typeof state.total === 'number' && (
                  <p className="text-emerald-400 text-lg mt-2">お支払い金額: ¥{state.total.toLocaleString()}</p>
                )}
              </div>

              <div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6 mb-8 text-left">
                <h2 className="text-lg font-semibold text-emerald-400 mb-3">当日について</h2>
                <ul className="text-stone-300 space-y-2">
                  <li>• 確認メールをお送りしましたのでご確認ください</li>
                  <li>• 開始時刻の5分前までにご来店ください</li>
                  <li>• 汚れてもよい服装でお越しください</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">トップページに戻る</Button>
                </Link>
                <Link href="/workshop" className="w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto text-stone-300 border border-stone-700 hover:bg-stone-800">
                    ワークショップ一覧へ
                  </Button>
                </Link>
              </div>
            </>
          )}

          {state.phase === 'pending' && (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">お支払いの確認中です</h1>
                <p className="text-lg text-stone-300">
                  ご予約は承っております。PayPayでのお支払いがまだ完了していない可能性があります。
                </p>
                {bookingNumber && <p className="text-stone-400 text-sm mt-2">予約番号: {bookingNumber}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleRecheck} disabled={isRechecking} className="w-full sm:w-auto">
                  {isRechecking ? '確認中...' : 'お支払い状況を再確認する'}
                </Button>
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto text-stone-300 border border-stone-700 hover:bg-stone-800">
                    お問い合わせ
                  </Button>
                </Link>
              </div>
            </>
          )}

          {state.phase === 'failed' && (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">お支払いが完了しませんでした</h1>
                <p className="text-lg text-stone-300">
                  ご予約自体は承っております。当日、店頭でのお支払いも可能です。
                </p>
                {bookingNumber && <p className="text-stone-400 text-sm mt-2">予約番号: {bookingNumber}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleRecheck} disabled={isRechecking} className="w-full sm:w-auto">
                  {isRechecking ? '確認中...' : 'お支払い状況を再確認する'}
                </Button>
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto text-stone-300 border border-stone-700 hover:bg-stone-800">
                    お問い合わせ
                  </Button>
                </Link>
              </div>
            </>
          )}

          {state.phase === 'error' && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-4">お支払い状況を確認できませんでした</h1>
                <p className="text-lg text-stone-300">{state.message}</p>
                {bookingNumber && <p className="text-stone-400 text-sm mt-2">予約番号: {bookingNumber}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleRecheck} disabled={isRechecking} className="w-full sm:w-auto">
                  {isRechecking ? '確認中...' : '再度確認する'}
                </Button>
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto text-stone-300 border border-stone-700 hover:bg-stone-800">
                    お問い合わせ
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}

export default function WorkshopPayPayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-stone-950 min-h-screen pt-20">
          <Container className="py-16">
            <div className="max-w-2xl mx-auto text-center">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-stone-800 rounded-full mx-auto mb-4" />
                <div className="h-8 bg-stone-800 rounded mb-4" />
                <div className="h-4 bg-stone-800 rounded mb-8" />
              </div>
            </div>
          </Container>
        </div>
      }
    >
      <WorkshopPayPayReturnContent />
    </Suspense>
  );
}
