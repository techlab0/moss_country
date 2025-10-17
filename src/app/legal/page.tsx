import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | MOSS COUNTRY',
  description: 'MOSS COUNTRYの特定商取引法に基づく表記、事業者情報、販売条件について',
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              特定商取引法に基づく表記
            </h1>
            
            <div className="space-y-8">
              {/* 事業者情報 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-emerald-600 pb-2">
                  事業者情報
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="font-medium text-gray-700">事業者名</dt>
                    <dd className="text-gray-900">MOSS COUNTRY</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">代表者</dt>
                    <dd className="text-gray-900">立桶 賢（たておけ さとる）</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">所在地</dt>
                    <dd className="text-gray-900">札幌市西区発寒11条4丁目3-1</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">電話番号</dt>
                    <dd className="text-gray-900">080-3605-6340</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-medium text-gray-700">メールアドレス</dt>
                    <dd className="text-gray-900">moss.country.kokenokuni@gmail.com</dd>
                  </div>
                </div>
              </section>

              {/* 販売価格・支払い方法 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-emerald-600 pb-2">
                  販売価格・支払い方法
                </h2>
                <div className="space-y-4">
                  <div>
                    <dt className="font-medium text-gray-700">販売価格</dt>
                    <dd className="text-gray-900">
                      商品ページに表示された価格（税込価格）。別途送料が必要な場合があります。
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">支払い方法</dt>
                    <dd className="text-gray-900">
                      クレジットカード決済（Square決済システム）
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">支払い期限</dt>
                    <dd className="text-gray-900">
                      決済完了時点
                    </dd>
                  </div>
                </div>
              </section>

              {/* 配送・引渡時期 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-emerald-600 pb-2">
                  配送・引渡時期
                </h2>
                <div className="space-y-4">
                  <div>
                    <dt className="font-medium text-gray-700">配送料</dt>
                    <dd className="text-gray-900">
                      商品の重量・サイズに応じて配送料が決定されます。<br />
                      配送料は注文確認画面でご確認いただけます。
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">引渡時期</dt>
                    <dd className="text-gray-900">
                      ご入金確認後、3-7営業日以内に発送いたします。<br />
                      在庫切れの場合は別途ご連絡いたします。
                    </dd>
                  </div>
                </div>
              </section>

              {/* 返品・交換 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-emerald-600 pb-2">
                  返品・交換について
                </h2>
                <div className="space-y-4">
                  <div>
                    <dt className="font-medium text-gray-700">返品・交換期限</dt>
                    <dd className="text-gray-900">
                      商品到着後7日以内にご連絡ください。<br />
                      生体（苔）については、お客様都合による返品はお受けできません。
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">返品・交換対象</dt>
                    <dd className="text-gray-900">
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>商品に欠陥がある場合</li>
                        <li>配送中の破損</li>
                        <li>注文と異なる商品が届いた場合</li>
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">返品送料</dt>
                    <dd className="text-gray-900">
                      当店の都合による返品：当店負担<br />
                      お客様都合による返品：お客様負担
                    </dd>
                  </div>
                </div>
              </section>

              {/* その他の条件 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-emerald-600 pb-2">
                  その他の販売条件
                </h2>
                <div className="space-y-4">
                  <div>
                    <dt className="font-medium text-gray-700">営業時間</dt>
                    <dd className="text-gray-900">
                      11:00-20:00（営業日：不定休）<br />
                      お問い合わせ受付：24時間（メール）
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">ワークショップ</dt>
                    <dd className="text-gray-900">
                      事前予約制。キャンセルは開催日の3日前まで可能。<br />
                      キャンセル料：前日 50%、当日 100%
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">個人情報の取扱い</dt>
                    <dd className="text-gray-900">
                      当店の<a href="/privacy" className="text-emerald-600 hover:underline">プライバシーポリシー</a>をご確認ください。
                    </dd>
                  </div>
                </div>
              </section>

              {/* お問い合わせ */}
              <section className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  お問い合わせ
                </h2>
                <p className="text-gray-700 mb-4">
                  商品やサービスに関するご質問、ご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">電話：</span>
                    <a href="tel:080-3605-6340" className="text-emerald-600 hover:underline">
                      080-3605-6340
                    </a>
                  </p>
                  <p>
                    <span className="font-medium">メール：</span>
                    <a href="mailto:moss.country.kokenokuni@gmail.com" className="text-emerald-600 hover:underline">
                      moss.country.kokenokuni@gmail.com
                    </a>
                  </p>
                  <p>
                    <span className="font-medium">お問い合わせフォーム：</span>
                    <a href="/contact" className="text-emerald-600 hover:underline">
                      こちらから
                    </a>
                  </p>
                </div>
              </section>

              <div className="text-right text-sm text-gray-500">
                最終更新日：2025年9月12日
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}