'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';

const inquiryTypes = [
  '商品について',
  'ワークショップについて',
  'オーダーメイドについて',
  'メンテナンス・修理について',
  '取材・メディア関係',
  'その他',
];

export default function ContactPage() {
  // 管理画面の「ページ編集」で保存された文言を反映する（保存がなければ従来の文言）
  const { t } = usePageContent('contact');
  const contactMethods = [1, 2, 3].map(i => ({
    title: t(`method${i}Title`),
    description: t(`method${i}Desc`),
    info: t(`method${i}Info`),
    hours: t(`method${i}Hours`),
  }));
  const faqItems = [1, 2, 3, 4].map(i => ({
    question: t(`faq${i}Q`),
    answer: t(`faq${i}A`),
  }));
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    subject: '',
    message: '',
    agreement: false,
    // スパムボット対策のハニーポット。画面上は見えないフィールドで、値が入っていたらボットとみなす
    website: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['contact'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['contact'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['contact-mobile'].src);

  // 画面サイズを監視してモバイルかどうかを判定
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ヒーロー画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    fetch(`/api/images/hero?page=contact`)
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
    fetch(`/api/images/background?page=contact&mobile=false`)
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
    fetch(`/api/images/background?page=contact&mobile=true`)
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

    // ハニーポットに値が入っていたらボットとみなし、送信もメール通知もせず成功を装う
    // （拒否されたことを悟らせないため、見た目は通常の成功と同じにする）
    if (formData.website.trim() !== '') {
      setSubmitMessage('お問い合わせありがとうございます。24時間以内にご返信させていただきます。');
      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: '',
        subject: '',
        message: '',
        agreement: false,
        website: '',
      });
      setIsSubmitting(false);
      return;
    }

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
        setSubmitMessage('お問い合わせありがとうございます。24時間以内にご返信させていただきます。');

        setFormData({
          name: '',
          email: '',
          phone: '',
          inquiryType: '',
          subject: '',
          message: '',
          agreement: false,
          website: '',
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
    <div className="min-h-screen site-page-tone">
      {/* Hero Section */}
      <section className="py-20 relative min-h-[50vh] flex items-center" style={{
        backgroundImage: `url('${heroImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="absolute inset-0 bg-black/40"></div>
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl">
              {t('heroTitle')}
            </h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-xl text-white max-w-3xl mx-auto drop-shadow-lg whitespace-pre-line">
              {t('heroLead')}
            </p>
          </div>
        </Container>
      </section>

      {/* Contact Methods */}
      <section className="py-20 relative" style={{
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
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
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
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
                  {/* スパムボット対策のハニーポット。人間には見えず、CSSを解釈しないボットだけが入力する。
                      display:none だと無視するボットもいるため、画面外に飛ばす方式にしている */}
                  <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
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
            {faqItems.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-moss-green">{faq.question}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
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
