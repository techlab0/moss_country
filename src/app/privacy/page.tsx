import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | MOSS COUNTRY',
  description: 'MOSS COUNTRYの個人情報保護に関する方針について',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              プライバシーポリシー
            </h1>
            
            <div className="space-y-8">
              {/* 個人情報の収集について */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  個人情報の収集について
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  当店では、お客様に最適なサービスを提供するために、以下の個人情報を収集させていただく場合があります。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>お名前</li>
                  <li>メールアドレス</li>
                  <li>電話番号</li>
                  <li>住所・配送先情報</li>
                  <li>お問い合わせ内容</li>
                  <li>ワークショップへの参加履歴</li>
                  <li>購入履歴・決済情報</li>
                  <li>アクセスログ・IPアドレス</li>
                  <li>デバイス情報（OS、ブラウザ情報等）</li>
                  <li>Cookie及び類似技術による情報</li>
                  <li>ウェブサイトの利用状況・行動履歴</li>
                  <li>その他サービス提供に必要な情報</li>
                </ul>
              </section>

              {/* 個人情報の利用目的 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  個人情報の利用目的
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  収集させていただいた個人情報は、以下の目的で利用いたします。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>お問い合わせへの対応</li>
                  <li>商品の販売・配送・決済処理</li>
                  <li>ワークショップの予約確認・連絡</li>
                  <li>商品・サービスに関する情報提供</li>
                  <li>アフターサービス・カスタマーサポートの提供</li>
                  <li>新商品・イベント情報のご案内・マーケティング活動</li>
                  <li>サービス改善・品質向上のための分析</li>
                  <li>不正利用の防止・セキュリティ対策</li>
                  <li>法的義務の履行・権利の行使・防御</li>
                  <li>統計データの作成（個人を特定できない形式）</li>
                  <li>その他、上記に関連する業務</li>
                </ul>
              </section>

              {/* 個人情報の管理 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  個人情報の管理
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  お客様からお預かりした個人情報は、適切に管理し、以下の対策を講じております。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>個人情報への不正アクセス、紛失、破損、改ざん、漏洩などを防止するため、適切な安全対策を実施</li>
                  <li>個人情報を取り扱う従業員に対する教育・研修の実施</li>
                  <li>個人情報の取り扱いに関する規程の整備</li>
                  <li>定期的なセキュリティ対策の見直し</li>
                </ul>
              </section>

              {/* クレジットカード決済について */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  クレジットカード決済について
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  当店では、Square Inc.（米国）が提供する決済システムを利用しております。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700 mb-4">
                  <li>カード情報は、PCI DSS Level 1準拠のSquareシステムで安全に処理されます</li>
                  <li>当店では、お客様のカード番号、セキュリティコード等を保存・管理しておりません</li>
                  <li>決済処理は、Square Inc.のプライバシーポリシー及び利用規約に従って行われます</li>
                  <li>カード情報の安全管理及び決済処理に関しては、Square Inc.が責任を負います</li>
                </ul>
                <p className="text-gray-700">
                  Square Inc.のプライバシーポリシーについては、
                  <a href="https://squareup.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    こちら
                  </a>をご確認ください。
                </p>
              </section>

              {/* 個人情報の第三者提供 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  個人情報の第三者提供
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  当店は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>お客様の同意がある場合</li>
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要がある場合</li>
                  <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
                  <li>決済処理（Square Inc.）、配送、その他のサービス提供に必要な業務委託先への提供</li>
                  <li>合併、会社分割、営業譲渡等に伴う事業承継の場合</li>
                  <li>司法機関、行政機関、監督官庁等からの要請がある場合</li>
                  <li>当店の権利・利益の保護、不正行為の調査・防止のため必要がある場合</li>
                  <li>統計的データとして個人を識別できない状態で提供する場合</li>
                </ul>
              </section>

              {/* お客様の権利について */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  お客様の権利について
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  お客様は、当店が保有する個人情報について、以下の権利を有しています。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700 mb-4">
                  <li>個人情報の開示を求める権利</li>
                  <li>個人情報の訂正・追加・削除を求める権利</li>
                  <li>個人情報の利用停止・消去を求める権利</li>
                  <li>個人情報の第三者提供の停止を求める権利</li>
                </ul>
                <p className="text-gray-700">
                  これらの権利を行使される場合は、下記のお問い合わせ先までご連絡ください。
                </p>
              </section>

              {/* Cookieの使用について */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Cookieの使用について
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  当サイトでは、サービスの向上とお客様の利便性を高めるため、Cookieを使用しています。
                </p>
                <p className="text-gray-700">
                  Cookieの使用を希望されない場合は、ブラウザの設定によりCookieの使用を無効にすることができます。
                  ただし、Cookieを無効にした場合、サイトの一部機能が利用できない場合があります。
                </p>
              </section>

              {/* 個人情報の保存期間 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  個人情報の保存期間
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  個人情報の保存期間は、利用目的達成に必要な期間、法令等で定められた期間、または以下の期間のいずれか長い期間とします。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>購入履歴・決済情報：最終取引から7年間</li>
                  <li>お問い合わせ履歴：お問い合わせから3年間</li>
                  <li>アクセスログ・行動履歴：取得から2年間</li>
                  <li>その他の個人情報：目的達成後1年間</li>
                </ul>
              </section>

              {/* 免責事項 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  免責事項
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  以下の場合について、当店は一切の責任を負いません。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>システム障害、ネットワーク障害、天災等の不可抗力による個人情報の消失・漏洩</li>
                  <li>第三者サービス（決済サービス、配送サービス等）における個人情報の取扱い</li>
                  <li>お客様自身による個人情報の不適切な管理・開示</li>
                  <li>法令に基づく開示により生じた損害</li>
                  <li>本ポリシーに従った適切な処理による間接的損害</li>
                </ul>
              </section>

              {/* プライバシーポリシーの変更 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  プライバシーポリシーの変更
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    当店は、法令の改正や社会情勢の変化に対応するため、本プライバシーポリシーを適宜見直し、
                    予告なく変更することがあります。
                  </p>
                  <p>
                    変更後のプライバシーポリシーは、当サイトに掲載した時点から効力を生じるものとします。
                    重要な変更の場合は、適切な方法でお客様に通知いたします。
                  </p>
                </div>
              </section>

              {/* お問い合わせ先 */}
              <section className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  お問い合わせ先
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
                </p>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">MOSS COUNTRY</h3>
                  <p className="text-gray-700">
                    札幌市西区発寒11条4丁目3-1<br />
                    電話：
                    <a href="tel:080-3605-6340" className="text-emerald-600 hover:underline">
                      080-3605-6340
                    </a><br />
                    メール：
                    <a href="mailto:moss.country.kokenokuni@gmail.com" className="text-emerald-600 hover:underline">
                      moss.country.kokenokuni@gmail.com
                    </a><br />
                    営業時間：11:00-20:00（営業日：不定休）
                  </p>
                </div>
              </section>

              <div className="text-right text-sm text-gray-500">
                制定日：2025年9月11日<br />
                最終更新日：2025年9月12日
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}