'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { SquareCheckout } from '@/components/ui/SquareCheckout';
import { useCart } from '@/contexts/CartContext';
import { getEcommerceImageUrl, getProductSlug } from '@/lib/adapters';
import type { Cart, CheckoutFormData, ShippingCalculationResult } from '@/types/ecommerce';
import {
  resolveShippingFee,
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings,
  type ShippingItem,
  type CarrierId,
} from '@/lib/shipping';
import { taxBreakdown } from '@/lib/tax';

// カート内商品を送料計算用の最小形へ変換する。寸法・重量は sanityToEcommerceProduct 経由で
// 商品に引き継がれており、未入力の場合は shipping.ts 側でフォールバックされる。
function cartToShippingItems(items: Cart['items']): ShippingItem[] {
  return items.map((item) => ({
    dimensions: item.product.dimensions,
    weight: item.product.weight,
    fragile: item.product.fragile,
    quantity: item.quantity,
  }));
}

export default function CheckoutPage() {
  const { cart, clearCart, getShippingMethods, setShippingMethod } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [isPostalCodeLoading, setIsPostalCodeLoading] = useState(false);
  // 購入ロック（管理者トグル）: 閲覧・フォーム入力はできるが、注文/決済の確定のみ止める
  const [purchaseLocked, setPurchaseLocked] = useState(false);
  const [purchaseLockedMessage, setPurchaseLockedMessage] = useState('');
  const [shippingCalculation, setShippingCalculation] = useState<ShippingCalculationResult>({
    baseShippingCost: 0,
    finalShippingCost: 0,
    shippingDiscount: 0,
    tax: 0,
    total: cart.subtotal
  });
  // 管理画面で編集された送料設定。取得できるまではコード内デフォルトで計算する
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  // 配送業者をユーザーが手動で選択したかどうか。まだなら送料設定取得時にデフォルト業者へ追従させる
  const carrierTouchedRef = useRef(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    customer: {
      email: '',
      firstName: '',
      lastName: '',
      phone: ''
    },
    shippingAddress: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Japan',
      phone: ''
    },
    billingAddress: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Japan',
      phone: ''
    },
    sameAsShipping: true,
    shippingMethod: cart.shippingMethod?.id || 'standard', // カートで選択済みの配送方法を使用
    shippingCarrier: DEFAULT_SHIPPING_SETTINGS.carrier, // 送料設定取得後、管理者設定のデフォルト業者に更新される
    paymentMethod: 'credit_card',
    notes: '',
    newsletter: false,
    terms: false
  });

  const shippingMethods = getShippingMethods();
  const paymentMethods = [
    { id: 'credit_card', name: 'クレジットカード', description: 'Visa, MasterCard, JCB, AMEX' },
    { id: 'bank_transfer', name: '銀行振込', description: '振込手数料はお客様負担' },
    { id: 'cash_on_delivery', name: '代金引換', description: '手数料 ¥300' },
    // removable設計: 承認前・無効化したい場合は NEXT_PUBLIC_PAYPAY_ENABLED を false/未設定にするだけで
    // この選択肢自体が表示されなくなる（他の支払い方法には影響しない）
    ...(process.env.NEXT_PUBLIC_PAYPAY_ENABLED === 'true'
      ? [{ id: 'paypay', name: 'PayPay', description: 'PayPayアプリでお支払い' }]
      : [])
  ];

  // 購入ロックの状態をサーバーから取得（管理画面での切り替えを反映）。取得失敗時はロックなし扱いのまま。
  useEffect(() => {
    let mounted = true;
    fetch('/api/maintenance/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data) {
          setPurchaseLocked(data.purchaseLocked === true);
          setPurchaseLockedMessage(data.purchaseLockedMessage || '');
        }
      })
      .catch(() => {
        /* 取得失敗時はロックなし（既存動作）のまま継続 */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 送料設定をサーバーから取得（管理画面での編集を反映）。失敗時はデフォルト設定のまま。
  useEffect(() => {
    let mounted = true;
    fetch('/api/shipping/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data?.settings) {
          const settings = data.settings as ShippingSettings;
          setShippingSettings(settings);
          // ユーザーがまだ配送業者を手動選択していなければ、管理者設定のデフォルト業者に合わせる
          if (!carrierTouchedRef.current) {
            setFormData((prev) => ({ ...prev, shippingCarrier: settings.carrier }));
          }
        }
      })
      .catch(() => {
        /* 取得失敗時はデフォルト設定で継続 */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 指定した配送方法・配送業者での送料・税・合計をまとめて計算する。表示にもサーバー確定にも同じ resolveShippingFee を使う。
  const computeCheckoutTotals = (methodId: string, carrier?: CarrierId) => {
    if (!formData.shippingAddress.state || cart.items.length === 0) {
      return null;
    }
    const items = cartToShippingItems(cart.items);
    const result = resolveShippingFee(
      items,
      formData.shippingAddress.state,
      cart.subtotal,
      { express: methodId === 'express', carrier },
      shippingSettings
    );
    const finalShippingCost = result.ok ? result.fee : 0;
    // 商品価格・送料はいずれも税込。合計に上乗せせず、含まれる消費税を内税として逆算表示する。
    const total = cart.subtotal + finalShippingCost;
    const tax = taxBreakdown(total).taxAmount;
    return { result, finalShippingCost, tax, total };
  };

  // お客様情報の姓名を配送先住所に自動入力
  React.useEffect(() => {
    if (formData.customer.firstName && formData.customer.lastName) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          firstName: prev.customer.firstName,
          lastName: prev.customer.lastName
        }
      }));
    }
  }, [formData.customer.firstName, formData.customer.lastName]);

  // 送料・税込合計の再計算（商品の寸法・重量・送料設定・選択中の配送業者を考慮）
  useEffect(() => {
    const selectedCarrier = formData.shippingCarrier ?? shippingSettings.carrier;
    const computed = computeCheckoutTotals(formData.shippingMethod, selectedCarrier);
    if (computed) {
      const { result, finalShippingCost, tax, total } = computed;
      setShippingCalculation({
        baseShippingCost: result.baseFee + result.surcharge, // 割引前の送料
        finalShippingCost,
        shippingDiscount: result.discount,
        tax,
        total,
        shippingDetails: {
          carrierLabel: shippingSettings.carriers[selectedCarrier]?.label,
          size: result.size,
          dimensionSum: result.dimensionSum,
          totalWeight: result.totalWeight,
          baseFee: result.baseFee,
          surcharge: result.surcharge,
          discount: result.discount,
          totalCost: result.baseFee + result.surcharge,
          error: result.ok ? undefined : result.error,
        },
      });
    } else {
      // 住所未入力時はリセット
      setShippingCalculation({
        baseShippingCost: 0,
        finalShippingCost: 0,
        shippingDiscount: 0,
        tax: 0,
        total: cart.subtotal
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.shippingAddress.state, formData.shippingMethod, formData.shippingCarrier, cart.items, cart.subtotal, shippingSettings]);

  // カートが空の場合のリダイレクト
  if (cart.items.length === 0 && !orderComplete) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20">
        <Container>
          <div className="text-center py-20">
            <h1 className="text-3xl font-light text-white mb-4">
              カートが空です
            </h1>
            <p className="text-stone-400 mb-8">
              商品をカートに追加してからチェックアウトしてください。
            </p>
            <Link href="/shop">
              <Button variant="primary" size="lg">
                商品を見る
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  // 郵便番号から住所を自動取得
  const handlePostalCodeChange = async (postalCode: string) => {
    // 郵便番号の形式チェック（7桁の数字、ハイフンありなし両方対応）
    const cleanedPostalCode = postalCode.replace(/[-－]/g, '');
    if (cleanedPostalCode.length !== 7 || !/^\d{7}$/.test(cleanedPostalCode)) {
      return; // 無効な郵便番号は処理しない
    }

    setIsPostalCodeLoading(true);
    
    try {
      // 郵便番号API（zipcloud.ibsnet.co.jp）を使用
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedPostalCode}`);
      const data = await response.json();
      
      if (data.status === 200 && data.results && data.results.length > 0) {
        const address = data.results[0];
        
        setFormData(prev => ({
          ...prev,
          shippingAddress: {
            ...prev.shippingAddress,
            postalCode: postalCode, // 元の形式を保持
            state: address.address1, // 都道府県
            city: address.address2 + address.address3, // 市区町村
            // address1は手動入力のまま（番地以降）
          }
        }));
      } else {
        console.warn('郵便番号に対応する住所が見つかりませんでした');
      }
    } catch (error) {
      console.error('住所の自動取得に失敗しました:', error);
    } finally {
      setIsPostalCodeLoading(false);
    }
  };

  const handleInputChange = (section: keyof CheckoutFormData, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' ? {
        ...prev[section],
        [field]: value
      } : value
    }));

    // 郵便番号が変更された場合の自動住所取得
    if (section === 'shippingAddress' && field === 'postalCode' && typeof value === 'string') {
      handlePostalCodeChange(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseLocked) {
      alert(purchaseLockedMessage || 'ただいまオンライン販売の準備中です。まもなく開始しますので、今しばらくお待ちください。');
      return;
    }
    setIsProcessing(true);

    try {
      // 支払い方法による分岐（クレジットカード決済の場合はSquareCheckoutコンポーネント側で処理）
      if (formData.paymentMethod === 'paypay') {
        // PayPayの場合：決済URLを発行し、PayPayアプリの支払い画面へリダイレクトする
        // （成功時はページ遷移するため、以降のsetOrderComplete等には到達しない）
        await processPayPayPayment();
      } else if (formData.paymentMethod !== 'credit_card') {
        // 銀行振込・代金引換の場合：注文を確定する
        await processNonCardPayment();

        sessionStorage.setItem('completedOrder', JSON.stringify({ paymentMethod: formData.paymentMethod }));
        setOrderComplete(true);
        clearCart();
      }
    } catch (error) {
      console.error('Order processing failed:', error);
      alert(error instanceof Error ? error.message : '注文の処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 非カード決済の処理（振込・代金引換）: 実際に注文をサーバーへ保存する
  const processNonCardPayment = async () => {
    const cartPayload: Cart = {
      items: cart.items,
      subtotal: cart.subtotal,
      shippingCost: shippingCalculation.finalShippingCost,
      baseShippingCost: shippingCalculation.baseShippingCost,
      shippingDiscount: shippingCalculation.shippingDiscount,
      tax: shippingCalculation.tax,
      total: shippingCalculation.total,
      itemCount: cart.itemCount,
    };

    const response = await fetch('/api/orders/create-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: cartPayload,
        customerData: formData.customer,
        orderData: {
          shippingAddress: formData.shippingAddress,
          billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
          shippingMethod: formData.shippingMethod,
          shippingCarrier: formData.shippingCarrier,
          paymentMethod: formData.paymentMethod,
          sameAsShipping: formData.sameAsShipping,
          terms: formData.terms,
          newsletter: formData.newsletter,
          notes: formData.notes,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || '注文の作成に失敗しました');
    }
  };

  // PayPayウェブ決済の処理: サーバー側で注文をpending保存のうえ決済URLを発行し、
  // PayPayアプリの支払い画面へリダイレクトする。決済結果の反映は戻りページ
  // （/payment/paypay/return）が /api/payments/paypay/verify を呼んで行う。
  const processPayPayPayment = async () => {
    const cartPayload: Cart = {
      items: cart.items,
      subtotal: cart.subtotal,
      shippingCost: shippingCalculation.finalShippingCost,
      baseShippingCost: shippingCalculation.baseShippingCost,
      shippingDiscount: shippingCalculation.shippingDiscount,
      tax: shippingCalculation.tax,
      total: shippingCalculation.total,
      itemCount: cart.itemCount,
    };

    const response = await fetch('/api/payments/paypay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: cartPayload,
        customerData: formData.customer,
        orderData: {
          shippingAddress: formData.shippingAddress,
          billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
          shippingMethod: formData.shippingMethod,
          shippingCarrier: formData.shippingCarrier,
          paymentMethod: formData.paymentMethod,
          sameAsShipping: formData.sameAsShipping,
          terms: formData.terms,
          newsletter: formData.newsletter,
          notes: formData.notes,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success || !result.data?.paymentUrl) {
      throw new Error(result.error || 'PayPay決済の開始に失敗しました');
    }

    // 注文はサーバー側で既にpending保存済みのため、カートを空にしてからPayPayの支払い画面へ遷移する
    clearCart();
    window.location.href = result.data.paymentUrl;
  };

  // 注文完了画面
  if (orderComplete) {
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
                ご注文ありがとうございます
              </h1>
              <div className="text-lg text-stone-300 mb-8">
                {(() => {
                  const savedOrderData = sessionStorage.getItem('completedOrder');
                  const orderData = savedOrderData ? JSON.parse(savedOrderData) : null;
                  const paymentMethod = orderData?.paymentMethod;

                  if (paymentMethod === 'bank_transfer') {
                    return (
                      <>
                        <p>お振込のご案内をメールでお送りしました。</p>
                        <p className="text-emerald-400 mt-2">
                          <strong>3日以内にお振込をお願いいたします。</strong>
                        </p>
                        <p className="text-sm mt-2">
                          ご入金確認後、商品の準備を開始いたします。
                        </p>
                      </>
                    );
                  } else if (paymentMethod === 'cash_on_delivery') {
                    return (
                      <>
                        <p>代金引換でのご注文を承りました。</p>
                        <p className="text-sm mt-2">
                          商品の準備ができ次第、発送いたします。<br />
                          商品到着時に配送業者へお支払いください。
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <p>注文確認メールをお送りしました。</p>
                        <p className="text-sm mt-2">
                          商品の準備ができ次第、発送いたします。
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
            </div>
            
            <div className="space-y-4">
              <Link href="/shop">
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
        <div className="py-8">
          <div className="border-b border-stone-800 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-white">
              チェックアウト
            </h1>
          </div>

          {purchaseLocked && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <p className="text-amber-900 font-medium">
                {purchaseLockedMessage || 'ただいまオンライン販売の準備中です。まもなく開始しますので、今しばらくお待ちください。'}
              </p>
              <p className="text-amber-800 text-sm mt-1">
                商品の閲覧・カートへの追加はできますが、注文の確定は現在停止しています。
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* チェックアウトフォーム */}
              <div className="lg:col-span-2 space-y-8">
                {/* お客様情報 */}
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                  <h2 className="text-xl font-medium text-white mb-6">お客様情報</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-300 text-sm font-medium mb-2">
                        姓 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customer.lastName}
                        onChange={(e) => handleInputChange('customer', 'lastName', e.target.value)}
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-300 text-sm font-medium mb-2">
                        名 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customer.firstName}
                        onChange={(e) => handleInputChange('customer', 'firstName', e.target.value)}
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-stone-300 text-sm font-medium mb-2">
                        メールアドレス <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.customer.email}
                        onChange={(e) => handleInputChange('customer', 'email', e.target.value)}
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-stone-300 text-sm font-medium mb-2">
                        電話番号 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.customer.phone}
                        onChange={(e) => handleInputChange('customer', 'phone', e.target.value)}
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 配送先住所 */}
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium text-white">配送先住所</h2>
                    <p className="text-xs text-stone-400">お客様情報の姓名が自動入力されます</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-stone-300 text-sm font-medium mb-2">
                          姓 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.shippingAddress.lastName}
                          onChange={(e) => handleInputChange('shippingAddress', 'lastName', e.target.value)}
                          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-300 text-sm font-medium mb-2">
                          名 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.shippingAddress.firstName}
                          onChange={(e) => handleInputChange('shippingAddress', 'firstName', e.target.value)}
                          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-stone-300 text-sm font-medium mb-2">
                        郵便番号 <span className="text-red-400">*</span>
                        {isPostalCodeLoading && (
                          <span className="ml-2 text-xs text-emerald-400">住所を取得中...</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="000-0000"
                          value={formData.shippingAddress.postalCode}
                          onChange={(e) => handleInputChange('shippingAddress', 'postalCode', e.target.value)}
                          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                        {isPostalCodeLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        郵便番号を入力すると住所が自動入力されます
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-stone-300 text-sm font-medium mb-2">
                          都道府県 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.shippingAddress.state}
                          onChange={(e) => handleInputChange('shippingAddress', 'state', e.target.value)}
                          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-300 text-sm font-medium mb-2">
                          市区町村 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.shippingAddress.city}
                          onChange={(e) => handleInputChange('shippingAddress', 'city', e.target.value)}
                          className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-300 text-sm font-medium mb-2">
                        住所（番地・建物名） <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="例：1-2-3 マンション名 101号室"
                        value={formData.shippingAddress.address1}
                        onChange={(e) => handleInputChange('shippingAddress', 'address1', e.target.value)}
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 text-white rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                  </div>
                </div>

                {/* 配送業者 */}
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                  <h2 className="text-xl font-medium text-white mb-6">配送業者</h2>
                  <div className="space-y-3">
                    {(Object.keys(shippingSettings.carriers) as CarrierId[]).map((carrierId) => {
                      const carrierInfo = shippingSettings.carriers[carrierId];
                      const computed = formData.shippingAddress.state && cart.items.length > 0
                        ? computeCheckoutTotals(formData.shippingMethod, carrierId)
                        : null;
                      return (
                        <label
                          key={carrierId}
                          className="flex items-center gap-4 p-4 border border-stone-700 rounded-lg cursor-pointer hover:border-stone-600 transition-colors"
                        >
                          <input
                            type="radio"
                            name="shippingCarrier"
                            value={carrierId}
                            checked={formData.shippingCarrier === carrierId}
                            onChange={() => {
                              carrierTouchedRef.current = true;
                              setFormData(prev => ({ ...prev, shippingCarrier: carrierId }));
                            }}
                            className="text-emerald-500"
                          />
                          <div className="flex-grow">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-medium">{carrierInfo?.label || carrierId}</span>
                              <span className="text-emerald-400 font-medium">
                                {computed
                                  ? computed.result.ok
                                    ? (computed.finalShippingCost === 0 ? '無料' : `¥${computed.finalShippingCost.toLocaleString()}`)
                                    : '配送不可'
                                  : '住所入力後に計算'}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 配送方法 */}
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                  <h2 className="text-xl font-medium text-white mb-6">配送方法</h2>
                  <div className="space-y-3">
                    {shippingMethods.map((method) => (
                      <label 
                        key={method.id}
                        className="flex items-center gap-4 p-4 border border-stone-700 rounded-lg cursor-pointer hover:border-stone-600 transition-colors"
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={method.id}
                          checked={formData.shippingMethod === method.id}
                          onChange={(e) => {
                            handleInputChange('shippingMethod', '', e.target.value);
                            setShippingMethod(method); // カートの配送方法も更新
                          }}
                          className="text-emerald-500"
                        />
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white font-medium">{method.name}</span>
                            <span className="text-emerald-400 font-medium">
                              {formData.shippingAddress.state && cart.items.length > 0 ? (() => {
                                const computed = computeCheckoutTotals(method.id, formData.shippingCarrier);
                                if (computed && computed.result.ok) {
                                  return computed.finalShippingCost === 0 ? '無料' : `¥${computed.finalShippingCost.toLocaleString()}`;
                                }
                                return computed ? '配送不可' : '計算中...';
                              })() : '住所入力後に計算'}
                            </span>
                          </div>
                          <p className="text-stone-400 text-sm">
                            {method.description}
                            {formData.shippingAddress.state && cart.items.length > 0 && (() => {
                              const computed = computeCheckoutTotals(method.id, formData.shippingCarrier);
                              if (computed && computed.result.ok) {
                                return ` (サイズ${computed.result.size})`;
                              }
                              return '';
                            })()}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 支払い方法 */}
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                  <h2 className="text-xl font-medium text-white mb-6">支払い方法</h2>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label 
                        key={method.id}
                        className="flex items-center gap-4 p-4 border border-stone-700 rounded-lg cursor-pointer hover:border-stone-600 transition-colors"
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={formData.paymentMethod === method.id}
                          onChange={(e) => handleInputChange('paymentMethod', '', e.target.value)}
                          className="text-emerald-500"
                        />
                        <div>
                          <div className="text-white font-medium mb-1">{method.name}</div>
                          <p className="text-stone-400 text-sm">{method.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 利用規約 */}
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800">
                  <div className="space-y-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        required
                        checked={formData.terms}
                        onChange={(e) => handleInputChange('terms', '', e.target.checked)}
                        className="mt-1 text-emerald-500"
                      />
                      <span className="text-stone-300 text-sm">
                        <Link href="/privacy" className="text-emerald-400 hover:underline">利用規約</Link>
                        および
                        <Link href="/privacy" className="text-emerald-400 hover:underline">プライバシーポリシー</Link>
                        に同意します <span className="text-red-400">*</span>
                      </span>
                    </label>
                    
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.newsletter}
                        onChange={(e) => handleInputChange('newsletter', '', e.target.checked)}
                        className="mt-1 text-emerald-500"
                      />
                      <span className="text-stone-300 text-sm">
                        新商品やセール情報のメール配信を希望します
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 注文サマリー */}
              <div className="lg:col-span-1">
                <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800 sticky top-24">
                  <h2 className="text-xl font-medium text-white mb-6">注文内容</h2>

                  {/* 商品リスト */}
                  <div className="space-y-4 mb-6">
                    {cart.items.map((item) => {
                      const itemKey = `${item.product._id}-${item.variant?._key || 'default'}`;
                      const imageUrl = getEcommerceImageUrl(item.product.images?.[0]);

                      return (
                        <div key={itemKey} className="flex gap-4">
                          <div className="relative">
                            <Link href={`/shop/${getProductSlug(item.product)}`}>
                              <ImagePlaceholder
                                src={imageUrl}
                                alt={item.product.name}
                                width={60}
                                height={60}
                                className="w-15 h-15 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            </Link>
                            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-grow">
                            <Link href={`/shop/${getProductSlug(item.product)}`}>
                              <h3 className="text-white font-medium text-sm line-clamp-2 hover:text-emerald-400 transition-colors cursor-pointer">
                                {item.product.name}
                              </h3>
                            </Link>
                            {item.variant && (
                              <p className="text-stone-400 text-xs mt-1">
                                {item.variant.name}
                              </p>
                            )}
                            <p className="text-emerald-400 font-medium text-sm mt-1">
                              ¥{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 価格詳細 */}
                  <div className="space-y-3 mb-6 pt-6 border-t border-stone-700">
                    <div className="flex justify-between text-stone-300">
                      <span>商品小計</span>
                      <span>¥{cart.subtotal.toLocaleString()}</span>
                    </div>
                    
                    {formData.shippingAddress.state ? (
                      <>
                        {/* 配送詳細情報 */}
                        {shippingCalculation.shippingDetails && !shippingCalculation.shippingDetails.error && (
                          <div className="text-xs text-stone-400 p-3 bg-stone-800/30 rounded-lg mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span>配送方式</span>
                              <span>
                                {shippingCalculation.shippingDetails.carrierLabel || '配送'}
                                {shippingCalculation.shippingDetails.size ? ` ${shippingCalculation.shippingDetails.size}サイズ` : ''}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span>梱包サイズ（3辺合計）</span>
                              <span>約{shippingCalculation.shippingDetails.dimensionSum || 0}cm</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span>総重量（梱包込）</span>
                              <span>{((shippingCalculation.shippingDetails.totalWeight || 0) / 1000).toFixed(1)}kg</span>
                            </div>
                            {(shippingCalculation.shippingDetails.surcharge || 0) > 0 && (
                              <div className="flex justify-between items-center">
                                <span>加算（速達・割れ物など）</span>
                                <span>+¥{(shippingCalculation.shippingDetails.surcharge || 0).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* エラー表示 */}
                        {shippingCalculation.shippingDetails && shippingCalculation.shippingDetails.error && (
                          <div className="text-xs text-red-400 p-3 bg-red-900/20 border border-red-800 rounded-lg mb-3">
                            <div className="font-medium mb-1">配送料計算エラー</div>
                            <div>{shippingCalculation.shippingDetails.error}</div>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-stone-300">
                          <span>配送料（{formData.shippingAddress.state}）</span>
                          <span>
                            {shippingCalculation.baseShippingCost > shippingCalculation.finalShippingCost ? (
                              <div className="text-right">
                                <div className="text-stone-500 line-through text-sm">¥{shippingCalculation.baseShippingCost.toLocaleString()}</div>
                                <div>{shippingCalculation.finalShippingCost === 0 ? '無料' : `¥${shippingCalculation.finalShippingCost.toLocaleString()}`}</div>
                              </div>
                            ) : (
                              shippingCalculation.finalShippingCost === 0 ? '無料' : `¥${shippingCalculation.finalShippingCost.toLocaleString()}`
                            )}
                          </span>
                        </div>
                        {shippingCalculation.shippingDiscount > 0 && (
                          <div className="flex justify-between text-emerald-400 text-sm">
                            <span>🎉 送料割引（1万円以上）</span>
                            <span>-¥{shippingCalculation.shippingDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-stone-400 text-sm">
                          <span>（内消費税）</span>
                          <span>¥{shippingCalculation.tax.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-stone-400 text-sm p-3 bg-stone-800/50 rounded-lg">
                        <p className="mb-1">配送先住所を入力すると送料が計算されます</p>
                        <p className="text-xs text-stone-500">配送元: 北海道札幌市</p>
                        <p className="text-xs text-stone-500 mt-2">
                          商品サイズ・重量に基づいた正確な送料を計算します
                        </p>
                      </div>
                    )}
                    
                    <div className="border-t border-stone-700 pt-3">
                      <div className="flex justify-between text-white text-lg font-medium">
                        <span>合計</span>
                        <span>¥{shippingCalculation.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 決済コンポーネント */}
                  {formData.paymentMethod === 'credit_card' ? (
                    <SquareCheckout
                      cart={{
                        items: cart.items,
                        subtotal: cart.subtotal,
                        shippingCost: shippingCalculation.finalShippingCost,
                        baseShippingCost: shippingCalculation.baseShippingCost,
                        shippingDiscount: shippingCalculation.shippingDiscount,
                        tax: shippingCalculation.tax,
                        total: shippingCalculation.total,
                        itemCount: cart.itemCount,
                      }}
                      customerData={formData.customer}
                      orderData={{
                        shippingAddress: formData.shippingAddress,
                        billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
                        shippingMethod: formData.shippingMethod,
                        shippingCarrier: formData.shippingCarrier,
                        paymentMethod: formData.paymentMethod,
                        sameAsShipping: formData.sameAsShipping,
                        terms: formData.terms,
                        newsletter: formData.newsletter,
                        notes: formData.notes
                      }}
                      mode="embedded"
                      disabled={purchaseLocked}
                      disabledMessage={purchaseLockedMessage}
                    />
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full py-4 text-lg font-medium"
                      disabled={isProcessing || !formData.terms || purchaseLocked}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {formData.paymentMethod === 'paypay' ? 'PayPayへ移動中...' : '注文処理中...'}
                        </div>
                      ) : formData.paymentMethod === 'paypay' ? (
                        `PayPayで支払う - ¥${shippingCalculation.total.toLocaleString()}`
                      ) : (
                        `注文を確定する - ¥${shippingCalculation.total.toLocaleString()}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
}