import { Suspense } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

function PaymentSuccessContent() {
  return (
    <div className="bg-stone-950 min-h-screen pt-20">
      <Container className="py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              お支払いが完了しました
            </h1>
            <p className="text-lg text-stone-300">
              ご注文いただき、ありがとうございます。
            </p>
          </div>

          <div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-emerald-400 mb-3">
              次のステップ
            </h2>
            <ul className="text-stone-300 space-y-2">
              <li>• 確認メールをお送りしましたのでご確認ください</li>
              <li>• 商品の準備が整い次第、発送いたします</li>
              <li>• 発送時に追跡番号をお知らせします</li>
              <li>• ご不明な点がございましたらお気軽にお問い合わせください</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                トップページに戻る
              </Button>
            </Link>
            <Link href="/products" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="w-full sm:w-auto text-stone-300 border border-stone-700 hover:bg-stone-800"
              >
                他の商品を見る
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-stone-800">
            <p className="text-sm text-stone-400">
              お困りのことがございましたら{' '}
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
                お問い合わせ
              </Link>{' '}
              ください。
            </p>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="bg-stone-950 min-h-screen pt-20">
        <Container className="py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-stone-800 rounded-full mx-auto mb-4"></div>
              <div className="h-8 bg-stone-800 rounded mb-4"></div>
              <div className="h-4 bg-stone-800 rounded mb-8"></div>
            </div>
          </div>
        </Container>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
