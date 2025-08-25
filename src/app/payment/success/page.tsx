import { Suspense } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

function PaymentSuccessContent() {
  return (
    <Container className="py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            お支払いが完了しました
          </h1>
          <p className="text-lg text-gray-600">
            ご注文いただき、ありがとうございます。
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            次のステップ
          </h2>
          <ul className="text-green-700 space-y-1 text-left">
            <li>• 確認メールをお送りしましたのでご確認ください</li>
            <li>• 商品の準備が整い次第、発送いたします</li>
            <li>• 発送時に追跡番号をお知らせします</li>
            <li>• ご不明な点がございましたらお気軽にお問い合わせください</li>
          </ul>
        </div>

        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link href="/orders">
            <Button>
              注文履歴を確認
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="secondary">
              他の商品を見る
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            お困りのことがございましたら{' '}
            <Link href="/contact" className="text-green-600 hover:text-green-700">
              お問い合わせ
            </Link>{' '}
            ください。
          </p>
        </div>
      </div>
    </Container>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <Container className="py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-8"></div>
          </div>
        </div>
      </Container>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}