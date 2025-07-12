import { getFAQs } from '@/lib/sanity'
import type { FAQ } from '@/types/sanity'
import { Container } from '@/components/layout/Container'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default async function FAQPage() {
  const faqs: FAQ[] = await getFAQs()

  // グループ化されたFAQ
  const groupedFAQs = faqs.reduce((acc, faq) => {
    const category = faq.category || 'その他'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

  return (
    <div className="min-h-screen py-8">
      <Container>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-moss-green mb-4">よくあるご質問</h1>
          <div className="w-24 h-1 bg-moss-green mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            MOSS COUNTRYのテラリウムや商品について、
            お客様からよくいただくご質問をまとめました。
          </p>
        </div>

        {faqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">現在FAQがありません。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedFAQs).map(([category, categoryFAQs]) => (
              <div key={category}>
                <h2 className="text-2xl font-semibold text-moss-green mb-6 pb-2 border-b-2 border-moss-green">
                  {category}
                </h2>
                <div className="grid gap-4">
                  {categoryFAQs.map((faq) => (
                    <Card key={faq._id} className="transition-shadow hover:shadow-lg">
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-moss-green flex items-start">
                          <span className="bg-moss-green text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                            Q
                          </span>
                          {faq.question}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start">
                          <span className="bg-warm-brown text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">
                            A
                          </span>
                          <div className="text-gray-700 leading-relaxed">
                            {faq.answer.split('\n').map((line, index) => (
                              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* お問い合わせセクション */}
        <div className="mt-16 text-center">
          <div className="bg-moss-green text-white p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">解決しない場合は</h2>
            <p className="text-lg mb-6 opacity-90">
              こちらに記載されていないご質問や、より詳しい情報が必要な場合は、
              お気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-white text-moss-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                お問い合わせフォーム
              </a>
              <a
                href="mailto:info@mosscountry.jp"
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-moss-green transition-colors"
              >
                メールでお問い合わせ
              </a>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}