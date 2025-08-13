'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import { EmailService } from '@/lib/email';
import type { OrderEmailData } from '@/lib/email';

interface CreditCardForm {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

export default function CreditCardPaymentPage() {
  const { clearCart } = useCart();
  const [orderData, setOrderData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [cardForm, setCardForm] = useState<CreditCardForm>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  useEffect(() => {
    // sessionStorageから注文データを取得
    const savedOrderData = sessionStorage.getItem('pendingOrder');
    if (savedOrderData) {
      setOrderData(JSON.parse(savedOrderData));
    } else {
      // 注文データがない場合はチェックアウト画面に戻る
      window.location.href = '/checkout';
    }
  }, []);

  const handleInputChange = (field: keyof CreditCardForm, value: string) => {
    setCardForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCardNumber = (value: string) => {
    // カード番号を4桁ずつ区切る
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = cleaned.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return cleaned;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      handleInputChange('cardNumber', formatted);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 4) {
      handleInputChange('cvv', value);
    }
  };

  const isFormValid = () => {
    return cardForm.cardNumber.replace(/\s/g, '').length >= 13 &&
           cardForm.expiryMonth &&
           cardForm.expiryYear &&
           cardForm.cvv.length >= 3 &&
           cardForm.cardholderName.length >= 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsProcessing(true);

    try {
      // クレジットカード決済処理のシミュレート
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 決済完了処理
      await processCreditCardPayment();
      
      // 注文データをクリア
      sessionStorage.removeItem('pendingOrder');
      
      setPaymentComplete(true);
      clearCart();
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('決済処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  const processCreditCardPayment = async () => {
    // 実際の実装では、決済APIに送信
    console.log('クレジットカード決済処理:', {
      orderData,
      cardInfo: {
        cardNumber: cardForm.cardNumber.replace(/\s/g, '').replace(/\d(?=\d{4})/g, '*'),
        cardholderName: cardForm.cardholderName,
        amount: orderData?.pricing?.total || 0
      }
    });

    // 決済完了メールの送信
    await sendCreditCardConfirmationEmail();
  };

  // SendGridを使用したクレジットカード決済完了メール送信
  const sendCreditCardConfirmationEmail = async () => {
    try {
      // 注文データをEmailService用の形式に変換
      const emailData: OrderEmailData = {
        orderNumber: orderData.orderNumber,
        customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
        customerEmail: orderData.customer.email,
        items: orderData.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price
        })),
        subtotal: orderData.pricing.subtotal,
        shippingCost: orderData.pricing.shipping,
        tax: orderData.pricing.tax || 0,
        total: orderData.pricing.total,
        paymentMethod: 'クレジットカード',
        shippingAddress: {
          firstName: orderData.shipping.firstName,
          lastName: orderData.shipping.lastName,
          address1: orderData.shipping.address1,
          address2: orderData.shipping.address2,
          city: orderData.shipping.city,
          state: orderData.shipping.state,
          postalCode: orderData.shipping.postalCode
        }
      };

      // 顧客向け確認メール送信
      const customerEmailSent = await EmailService.sendOrderConfirmationEmail(emailData);
      if (customerEmailSent) {
        console.log('✅ クレジットカード決済完了メール送信成功');
      } else {
        console.warn('⚠️ 決済完了メール送信失敗（設定未完了の可能性）');
      }

      // 管理者向け通知メール送信
      const adminEmailSent = await EmailService.sendAdminNotificationEmail(emailData);
      if (adminEmailSent) {
        console.log('✅ 管理者通知メール送信成功');
      } else {
        console.warn('⚠️ 管理者通知メール送信失敗（設定未完了の可能性）');
      }

    } catch (error) {
      console.error('クレジットカード決済メール送信エラー:', error);
      // メール送信エラーでも決済処理は継続
    }
  };

  // クレジットカード決済完了メールテンプレート（HTML版）
  const generateCreditCardEmailTemplate = (orderDate: string) => {
    const items = orderData?.items?.map((item: any) => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}個</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">¥${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">¥${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`
    ).join('') || '';

    const maskedCardNumber = cardForm.cardNumber.replace(/\s/g, '').replace(/\d(?=\d{4})/g, '*');

    return `
      <html>
      <body style="font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2D5A27; border-bottom: 3px solid #2D5A27; padding-bottom: 10px;">
            ご注文ありがとうございます
          </h1>
          
          <p>${orderData?.customer?.lastName} ${orderData?.customer?.firstName} 様</p>
          <p>この度は、MOSS COUNTRYをご利用いただき、誠にありがとうございます。<br>
          クレジットカードでの決済が完了いたしましたので、詳細をお知らせいたします。</p>

          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">✅ 決済完了</h3>
            <p>クレジットカード決済が正常に完了いたしました。</p>
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p><strong>カード番号：</strong> ${maskedCardNumber}</p>
              <p><strong>カード名義：</strong> ${cardForm.cardholderName}</p>
              <p style="font-size: 18px; color: #28a745; margin: 10px 0 0 0;">
                <strong>決済金額：¥${orderData?.pricing?.total?.toLocaleString() || 0}</strong>
              </p>
            </div>
            <p style="font-size: 14px; color: #666;">
              ※カード会社からの請求は通常1-2ヶ月後となります。<br>
              ※ご利用明細書での店舗名は「MOSS COUNTRY」と表示されます。
            </p>
          </div>

          <h3>📋 ご注文詳細</h3>
          <p><strong>注文日時：</strong>${orderDate}</p>
          <p><strong>支払方法：</strong>クレジットカード</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">商品名</th>
                <th style="padding: 10px; border: 1px solid #ddd;">数量</th>
                <th style="padding: 10px; border: 1px solid #ddd;">単価</th>
                <th style="padding: 10px; border: 1px solid #ddd;">小計</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>

          <div style="text-align: right; margin: 20px 0;">
            <p><strong>商品合計：¥${orderData?.pricing?.subtotal?.toLocaleString() || 0}</strong></p>
            <p><strong>送料：¥${orderData?.pricing?.shipping?.toLocaleString() || 0}</strong></p>
            <p style="font-size: 18px; color: #28a745;"><strong>決済金額：¥${orderData?.pricing?.total?.toLocaleString() || 0}</strong></p>
          </div>

          <h3>🚚 配送先情報</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p><strong>${orderData?.shipping?.lastName} ${orderData?.shipping?.firstName}</strong></p>
            <p>〒${orderData?.shipping?.postalCode}</p>
            <p>${orderData?.shipping?.state}${orderData?.shipping?.city}${orderData?.shipping?.address1}</p>
            ${orderData?.shipping?.address2 ? `<p>${orderData?.shipping?.address2}</p>` : ''}
            <p>電話番号: ${orderData?.shipping?.phone}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px;">
            <h4 style="color: #0c5460; margin-top: 0;">📦 発送について</h4>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>決済確認後、1-2営業日以内に商品の発送準備を開始いたします</li>
              <li>発送が完了しましたら、追跡番号をメールにてお送りいたします</li>
              <li>商品の到着までしばらくお待ちください</li>
            </ul>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #e8f5e8; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px;">
              ご不明な点がございましたら、お気軽にお問い合わせください。<br>
              今後ともMOSS COUNTRYをよろしくお願いいたします。
            </p>
          </div>

          <hr style="margin: 30px 0;">
          <footer style="text-align: center; font-size: 12px; color: #666;">
            <p>MOSS COUNTRY - テラリウム専門店</p>
            <p>代表: 立桶　賢 | Email: moss.country.kokenokuni@gmail.com | Tel: 080-3605-6340</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  };

  // クレジットカード決済完了メールテンプレート（テキスト版）
  const generateCreditCardEmailText = (orderDate: string) => {
    const items = orderData?.items?.map((item: any) => 
      `・${item.name} ${item.quantity}個 ¥${(item.price * item.quantity).toLocaleString()}`
    ).join('\n') || '';

    const maskedCardNumber = cardForm.cardNumber.replace(/\s/g, '').replace(/\d(?=\d{4})/g, '*');

    return `
MOSS COUNTRY ご注文ありがとうございます（決済完了）

${orderData?.customer?.lastName} ${orderData?.customer?.firstName} 様

この度は、MOSS COUNTRYをご利用いただき、誠にありがとうございます。
クレジットカードでの決済が完了いたしましたので、詳細をお知らせいたします。

【決済完了】
クレジットカード決済が正常に完了いたしました。

カード番号：${maskedCardNumber}
カード名義：${cardForm.cardholderName}
決済金額：¥${orderData?.pricing?.total?.toLocaleString() || 0}

※カード会社からの請求は通常1-2ヶ月後となります。
※ご利用明細書での店舗名は「MOSS COUNTRY」と表示されます。

【ご注文詳細】
注文日時：${orderDate}
支払方法：クレジットカード

【ご注文商品】
${items}

商品合計：¥${orderData?.pricing?.subtotal?.toLocaleString() || 0}
送料：¥${orderData?.pricing?.shipping?.toLocaleString() || 0}
決済金額：¥${orderData?.pricing?.total?.toLocaleString() || 0}

【配送先】
${orderData?.shipping?.lastName} ${orderData?.shipping?.firstName}
〒${orderData?.shipping?.postalCode}
${orderData?.shipping?.state}${orderData?.shipping?.city}${orderData?.shipping?.address1}
${orderData?.shipping?.address2 || ''}
TEL: ${orderData?.shipping?.phone}

【発送について】
・決済確認後、1-2営業日以内に商品の発送準備を開始いたします
・発送が完了しましたら、追跡番号をメールにてお送りいたします
・商品の到着までしばらくお待ちください

ご不明な点がございましたら、お気軽にお問い合わせください。
今後ともMOSS COUNTRYをよろしくお願いいたします。

────────────────────────
MOSS COUNTRY - テラリウム専門店
代表: 立桶　賢 | moss.country.kokenokuni@gmail.com | 080-3605-6340
────────────────────────
    `.trim();
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 10; i++) {
      const year = currentYear + i;
      years.push(
        <option key={year} value={year.toString()}>
          {year}
        </option>
      );
    }
    return years;
  };

  if (!orderData) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20 flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20">
        <Container>
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-4">
                決済が完了しました
              </h1>
              <p className="text-lg text-stone-300 mb-8">
                ご注文ありがとうございます。<br />
                決済完了の確認メールをお送りしました。
              </p>
            </div>
            
            <div className="space-y-4">
              <Link href="/products">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  買い物を続ける
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto border-stone-600 text-stone-300">
                  ホームに戻る
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
        <div className="max-w-2xl mx-auto py-8">
          <div className="border-b border-stone-800 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-white">
              クレジットカード決済
            </h1>
            <p className="text-stone-400 mt-2">
              決済金額: <span className="text-white font-medium">¥{orderData.pricing.total.toLocaleString()}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800 mb-6">
              <h2 className="text-xl font-medium text-white mb-6">カード情報</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-2">
                    カード番号 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1234 5678 9012 3456"
                    value={cardForm.cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-stone-300 text-sm font-medium mb-2">
                      月 <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={cardForm.expiryMonth}
                      onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                      className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">月</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                          {(i + 1).toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-stone-300 text-sm font-medium mb-2">
                      年 <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={cardForm.expiryYear}
                      onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                      className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">年</option>
                      {generateYearOptions()}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-stone-300 text-sm font-medium mb-2">
                      CVV <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={cardForm.cvv}
                      onChange={handleCvvChange}
                      className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-2">
                    カード名義人 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TARO YAMADA"
                    value={cardForm.cardholderName}
                    onChange={(e) => handleInputChange('cardholderName', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    カードに記載されている通りに、ローマ字で入力してください
                  </p>
                </div>
              </div>
            </div>

            {/* セキュリティ情報 */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <h3 className="text-blue-300 font-medium text-sm">セキュアな決済</h3>
                  <p className="text-blue-200 text-xs mt-1">
                    SSL暗号化通信により、お客様のカード情報は安全に保護されています。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link href="/checkout" className="flex-1">
                <Button variant="ghost" size="lg" className="w-full border-stone-600 text-stone-300">
                  戻る
                </Button>
              </Link>
              
              <Button 
                type="submit"
                variant="primary" 
                size="lg" 
                className="flex-1"
                disabled={isProcessing || !isFormValid()}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    決済処理中...
                  </div>
                ) : (
                  `¥${orderData.pricing.total.toLocaleString()} を決済する`
                )}
              </Button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
}