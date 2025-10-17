import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '利用規約 | MOSS COUNTRY',
  description: 'MOSS COUNTRYのウェブサイト及びサービス利用に関する規約について',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              利用規約
            </h1>
            
            <div className="space-y-8">
              {/* 第1条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第1条（適用）
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  この利用規約（以下「本規約」）は、MOSS COUNTRY（以下「当店」）が提供するウェブサイト及びサービス（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただくすべてのお客様（以下「利用者」）は、本規約に同意したものとみなします。
                </p>
              </section>

              {/* 第2条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第2条（サービス内容）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 本サービスは、テラリウム及び関連商品の販売、ワークショップの提供、苔に関する情報提供等を行うものです。
                  </p>
                  <p>
                    2. 本サービスの利用にあたり、会員登録は不要です。ただし、商品購入時には必要な情報をご入力いただきます。
                  </p>
                </div>
              </section>

              {/* 第3条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第3条（利用料金・決済）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 利用者は、商品購入及びサービス利用の対価として、当店が別途定め、本ウェブサイトに表示する料金を、当店が指定する方法により支払うものとします。
                  </p>
                  <p>
                    2. 決済方法は、Square Inc.が提供するクレジットカード決済システムによるものとします。
                  </p>
                  <p>
                    3. カード情報の処理は、PCI DSS Level 1準拠のSquare決済システムにより安全に処理され、当店ではカード情報を保存・管理いたしません。
                  </p>
                  <p>
                    4. 決済処理中のSquareシステムの障害、通信エラー、その他Square Inc.に起因する問題により生じた損害について、当店は一切の責任を負いません。
                  </p>
                  <p>
                    5. 利用者は、正確なカード情報及び本人確認情報を入力する責任を負い、不正確な情報による決済エラーや損害について当店は責任を負いません。
                  </p>
                </div>
              </section>

              {/* 第4条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第4条（禁止事項）
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                  <li>当店、ほかの利用者、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                  <li>本サービスによって得られた情報を商業的に利用する行為</li>
                  <li>当店のサービスの運営を妨害するおそれのある行為</li>
                  <li>不正アクセスをし、またはこれを試みる行為</li>
                  <li>虚偽の情報を提供する行為</li>
                  <li>不正な目的を持って本サービスを利用する行為</li>
                  <li>クレジットカードの不正利用やチャージバックの濫用を行う行為</li>
                  <li>正当な理由なく返品・交換を繰り返し要求する行為</li>
                  <li>当店スタッフに対する迷惑行為、威圧的な態度、過度なクレーム行為</li>
                  <li>商品の無断転売、オークションサイト等での転売を目的とした購入行為</li>
                  <li>著作権を侵害して商品画像やコンテンツを無断使用する行為</li>
                  <li>同業他社による競合調査、営業秘密の不正取得行為</li>
                  <li>その他、当店が不適切と判断する行為</li>
                </ul>
              </section>

              {/* 第6条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第6条（本サービスの提供の停止等）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 当店は、以下のいずれかの事由があると判断した場合、利用者に事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                    <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                    <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                    <li>その他、当店が本サービスの提供が困難と判断した場合</li>
                  </ul>
                  <p>
                    2. 当店は、本サービスの提供の停止または中断により、利用者または第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。
                  </p>
                </div>
              </section>

              {/* 第7条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第7条（著作権）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報に関してのみ、本サービスを利用し、投稿ないしアップロードすることができるものとします。
                  </p>
                  <p>
                    2. ユーザーが本サービスを利用して投稿ないしアップロードした文章、画像、映像等の著作権については、当該ユーザーその他既存の権利者に留保されるものとします。ただし、当店は、本サービスを利用して投稿ないしアップロードされた文章、画像、映像等について、本サービスの改良、品質の向上、または不備の補正等ならびに本サービスの周知宣伝等に必要な範囲で利用できるものとし、ユーザーは、この利用に関して、著作者人格権を行使しないものとします。
                  </p>
                  <p>
                    3. 前項本文の定めるものを除き、本サービス及び本サービスに関連する一切の情報についての著作権およびその他の知的財産権はすべて当店または当店にその利用を許諾した権利者に帰属し、ユーザーは無断で複製、譲渡、貸与、翻訳、改変、転載、公衆送信（送信可能化を含みます。）、伝送、配布、出版、営業使用等をしてはならないものとします。
                  </p>
                </div>
              </section>

              {/* 第8条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第8条（利用制限及び登録抹消）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 当店は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、投稿データを削除し、ユーザーに対して本サービスの全部もしくは一部の利用を制限しまたはユーザーとしての登録を抹消することができるものとします。
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>本規約のいずれかの条項に違反した場合</li>
                    <li>登録事項に虚偽の事実があることが判明した場合</li>
                    <li>決済手段として当該ユーザーが届け出たクレジットカードが利用停止となった場合</li>
                    <li>料金等の支払債務の不履行があった場合</li>
                    <li>当店からの連絡に対し、一定期間返答がない場合</li>
                    <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                    <li>その他、当店が本サービスの利用を適当でないと判断した場合</li>
                  </ul>
                  <p>
                    2. 当店は、本条に基づき当店が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
                  </p>
                </div>
              </section>

              {/* 第9条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第9条（保証の否認及び免責事項）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 当店は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
                  </p>
                  <p>
                    2. 苔などの生体商品については、自然物である特性上、個体差、成長の変化、環境による影響が生じることを利用者は理解し、これらに起因する商品の状態変化について当店は責任を負いません。
                  </p>
                  <p>
                    3. 当店は、本サービスに起因して利用者に生じたあらゆる損害について、当店の故意又は重過失による場合を除き、一切の責任を負いません。ただし、本サービスに関する当店と利用者との間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
                  </p>
                  <p>
                    4. 前項ただし書に定める場合であっても、当店は、以下の損害について一切の責任を負いません：
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>利用者の逸失利益、機会損失、精神的苦痛等の間接損害</li>
                    <li>第三者サービス（決済サービス、配送サービス等）に起因する損害</li>
                    <li>利用者の誤使用、不適切な管理に起因する損害</li>
                    <li>天災、事変、その他の不可抗力による損害</li>
                    <li>インターネット回線やシステムの障害による損害</li>
                  </ul>
                  <p>
                    5. 当店の責任が認められる場合であっても、損害賠償額は利用者が当該損害の原因となった取引で当店に支払った金額を上限とします。
                  </p>
                </div>
              </section>

              {/* 第10条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第10条（サービス内容の変更等）
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  当店は、利用者への事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、利用者はこれに同意するものとします。
                </p>
              </section>

              {/* 第11条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第11条（利用規約の変更）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 当店は以下の場合には、利用者の個別の同意を要することなく、本規約を変更することができるものとします。
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>本規約の変更が利用者の一般の利益に適合するとき。</li>
                    <li>本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。</li>
                  </ul>
                  <p>
                    2. 当店は利用者に対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を通知いたします。
                  </p>
                </div>
              </section>

              {/* 第12条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第12条（個人情報の取扱い）
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  当店は、本サービスの利用によって取得する個人情報については、当店「<a href="/privacy" className="text-emerald-600 hover:underline">プライバシーポリシー</a>」に従い適切に取り扱うものとします。
                </p>
              </section>

              {/* 第13条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第13条（通知または連絡）
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  ユーザーと当店との間の通知または連絡は、当店の定める方法によって行うものとします。当店は,ユーザーから,当店が別途定める方式に従った変更届け出がない限り,現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い,これらは,発信時にユーザーへ到達したものとみなします。
                </p>
              </section>

              {/* 第14条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第14条（権利義務の譲渡の禁止）
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  利用者は、当店の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
                </p>
              </section>

              {/* 第15条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第15条（返品・交換の制限）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 生体商品（苔等）については、商品の性質上、利用者の都合による返品・交換は一切お受けできません。
                  </p>
                  <p>
                    2. その他の商品についても、以下の場合は返品・交換をお受けできません：
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>商品到着後8日を経過した場合</li>
                    <li>利用者による商品の破損、汚損がある場合</li>
                    <li>商品のタグや包装が破損・紛失している場合</li>
                    <li>利用者による加工や改変が行われた場合</li>
                    <li>一度使用された商品</li>
                    <li>オーダーメイド商品</li>
                  </ul>
                  <p>
                    3. 返品・交換の可否及び条件については、当店が最終的な判断を行います。
                  </p>
                </div>
              </section>

              {/* 第16条 */}
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  第16条（準拠法・裁判管轄）
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    1. 本規約の解釈にあたっては、日本法を準拠法とします。
                  </p>
                  <p>
                    2. 本サービスに関して紛争が生じた場合には、札幌地方裁判所を第一審の専属的合意管轄裁判所とします。
                  </p>
                  <p>
                    3. 利用者は、本規約に同意することにより、上記管轄合意に同意したものとみなします。
                  </p>
                </div>
              </section>

              <div className="text-right text-sm text-gray-500">
                制定日：2025年9月12日<br />
                最終更新日：2025年9月12日（法的リスク軽減のため改訂）
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}