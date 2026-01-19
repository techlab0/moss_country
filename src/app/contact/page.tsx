'use client';

import React, { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import emailjs from '@emailjs/browser';

const contactMethods = [
  {
    title: '電話でのお問い合わせ',
    description: 'お急ぎの方はお電話でお気軽にお問い合わせください',
    info: '080-3605-6340',
    hours: '営業時間: 11:00-20:00 / 不定休（カレンダーをご確認ください）',
  },
  {
    title: 'メールでのお問い合わせ',
    description: '詳しいご相談やお見積りはメールでも承ります',
    info: 'moss.country.kokenokuni@gmail.com',
    hours: '通常3営業日以内にご返信いたします',
  },
  {
    title: '店舗でのご相談',
    description: '実際に商品を見ながらご相談いただけます',
    info: '札幌市西区発寒11条4丁目3-1',
    hours: '予約優先（当日来店も歓迎）',
  },
];

const inquiryTypes = [
  '商品について',
  'ワークショップについて',
  'オーダーメイドについて',
  'メンテナンス・修理について',
  '取材・メディア関係',
  'その他',
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    subject: '',
    message: '',
    agreement: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    
    try {
      // まずSupabaseデータベースに保存
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // EmailJSでメール送信
        try {
          await emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
            {
              from_name: formData.name,
              from_email: formData.email,
              phone: formData.phone || '未記入',
              inquiry_type: formData.inquiryType,
              subject: formData.subject,
              message: formData.message,
              to_email: 'moss.country.kokenokuni@gmail.com',
            },
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
          );
          
          setSubmitMessage('お問い合わせありがとうございます。24時間以内にご返信させていただきます。');
        } catch (emailError) {
          console.error('EmailJS送信エラー:', emailError);
          setSubmitMessage('お問い合わせを受け付けました。メール通知の送信に失敗しましたが、お問い合わせ内容は正常に保存されました。24時間以内にご返信させていただきます。');
        }
        
        setFormData({
          name: '',
          email: '',
          phone: '',
          inquiryType: '',
          subject: '',
          message: '',
          agreement: false,
        });
      } else {
        setSubmitMessage(result.message || '送信中にエラーが発生しました。お手数ですが、お電話でお問い合わせください。');
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      setSubmitMessage('送信中にエラーが発生しました。お手数ですが、お電話でお問い合わせください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 relative" style={{
        backgroundImage: 'url(/images/store/exterior.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-moss-green mb-6">
              お問い合わせ
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              テラリウムに関するご質問、ワークショップのお申し込み、
              オーダーメイドのご相談など、お気軽にお問い合わせください。
            </p>
          </div>
        </Container>
      </section>

      {/* Contact Methods */}
      <section className="py-20 relative" style={{
        backgroundImage: 'url(/images/store/exterior.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <Container className="relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              お問い合わせ方法
            </h2>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-lg text-gray-100">
              お客様のご都合に合わせてお選びください
            </p>
          </div>

          <div className="mb-16">
            {/* 電話とメールを横並び */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {contactMethods.slice(0, 2).map((method, index) => (
                <Card key={index} className="text-center hover:transform hover:scale-105 transition-all duration-300">
                  <CardHeader>
                    <h3 className="text-xl font-semibold text-moss-green mb-2">{method.title}</h3>
                    <p className="text-gray-600 mb-4">{method.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-light-blue p-4 rounded-lg mb-4">
                      <p className="font-semibold text-moss-green text-lg break-all">{method.info}</p>
                      <p className="text-sm text-gray-600 mt-2">{method.hours}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* 店舗での相談を下に配置 */}
            <div className="w-full">
              <Card className="hover:transform hover:scale-105 transition-all duration-300">
                <div className="grid md:grid-cols-2 gap-8 items-center p-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-moss-green mb-2">{contactMethods[2].title}</h3>
                    <p className="text-gray-600">{contactMethods[2].description}</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-light-blue p-4 rounded-lg">
                      <p className="font-semibold text-moss-green text-lg">{contactMethods[2].info}</p>
                      <p className="text-sm text-gray-600 mt-2">{contactMethods[2].hours}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Contact Form */}
      <section className="py-20 relative" style={{
        backgroundImage: 'url(/images/store/exterior.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  お問い合わせフォーム
                </h2>
                <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
                <p className="text-lg text-gray-100">
                  以下のフォームからお気軽にお問い合わせください
                </p>
              </div>
            </div>

            {submitMessage && (
              <div className={`mb-8 p-4 rounded-lg ${submitMessage.includes('エラー') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {submitMessage}
              </div>
            )}

            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-moss-green mb-2">
                        お名前 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green"
                        placeholder="田中 太郎"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-moss-green mb-2">
                        メールアドレス <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green"
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-moss-green mb-2">
                        電話番号
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green"
                        placeholder="011-123-4567"
                      />
                    </div>

                    {/* Inquiry Type */}
                    <div>
                      <label htmlFor="inquiryType" className="block text-sm font-medium text-moss-green mb-2">
                        お問い合わせ種類 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="inquiryType"
                        name="inquiryType"
                        value={formData.inquiryType}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green"
                      >
                        <option value="">選択してください</option>
                        {inquiryTypes.map((type, index) => (
                          <option key={index} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-moss-green mb-2">
                      件名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green"
                      placeholder="お問い合わせ内容を簡潔にお書きください"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-moss-green mb-2">
                      お問い合わせ内容 <span className="text-red-500">*</span>
                      <span className="text-sm text-gray-500 ml-2">({formData.message.length}/1000文字)</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      maxLength={1000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green resize-vertical"
                      placeholder="詳しいお問い合わせ内容をお書きください（1000文字以内）"
                    />
                  </div>

                  {/* Agreement */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="agreement"
                      name="agreement"
                      checked={formData.agreement}
                      onChange={handleInputChange}
                      required
                      className="mr-3 w-4 h-4 text-moss-green border-gray-300 rounded focus:ring-moss-green flex-shrink-0"
                    />
                    <label htmlFor="agreement" className="text-sm text-gray-700">
                      <span className="text-red-500">*</span>
                      <a href="/privacy" className="text-moss-green hover:underline">プライバシーポリシー</a>
                      に同意し、お問い合わせ内容の確認・回答のために個人情報を使用することに同意します。
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="text-center">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full md:w-auto"
                    >
                      {isSubmitting ? '送信中...' : 'お問い合わせを送信'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <div className="bg-black/60 backdrop-blur-sm p-8 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                よくあるご質問
              </h2>
              <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
              <p className="text-lg text-gray-100">
                お問い合わせ前にご確認ください
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-moss-green">ワークショップの予約はいつまでにすればよいですか？</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">開催日の3日前までにご予約をお願いいたします。人気のコースは早めに満席になることがありますので、お早めのご予約をお勧めします。</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-moss-green">オーダーメイドの制作期間はどのくらいですか？</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">内容により異なりますが、通常1-2週間程度お時間をいただいております。お急ぎの場合はご相談ください。</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-moss-green">テラリウムの配送は可能ですか？</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">はい、全国配送承っております。配送中の破損を防ぐため、特別な梱包でお送りいたします。送料は商品代金と別途頂戴いたします。</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-moss-green">メンテナンスサービスはありますか？</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">ご購入いただいたテラリウムのメンテナンスを承っております。植物の植え替えや容器のクリーニングなど、お気軽にご相談ください。</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-700">
              他にもご質問がございましたら、お気軽にお問い合わせください。
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}