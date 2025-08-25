'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { SquareCheckout } from '@/components/ui/SquareCheckout';
import { useCart } from '@/contexts/CartContext';
import { getEcommerceImageUrl } from '@/lib/adapters';
import type { CheckoutFormData, ShippingCalculationResult } from '@/types/ecommerce';

// 配送料金表（札幌から全国、実際のゆうパック料金を参考）
const SHIPPING_RATES = {
  yupack: {
    // ゆうパック料金表（札幌から）
    60: {
      '北海道': 810, '青森県': 1050, '岩手県': 1050, '宮城県': 1050, '秋田県': 1050,
      '山形県': 1050, '福島県': 1050, '茨城県': 1180, '栃木県': 1180, '群馬県': 1180,
      '埼玉県': 1180, '千葉県': 1180, '東京都': 1180, '神奈川県': 1180, '新潟県': 1180,
      '富山県': 1300, '石川県': 1300, '福井県': 1300, '山梨県': 1300, '長野県': 1300,
      '岐阜県': 1300, '静岡県': 1300, '愛知県': 1300, '三重県': 1300, '滋賀県': 1420,
      '京都府': 1420, '大阪府': 1420, '兵庫県': 1420, '奈良県': 1420, '和歌山県': 1420,
      '鳥取県': 1540, '島根県': 1540, '岡山県': 1540, '広島県': 1540, '山口県': 1540,
      '徳島県': 1540, '香川県': 1540, '愛媛県': 1540, '高知県': 1540, '福岡県': 1660,
      '佐賀県': 1660, '長崎県': 1660, '熊本県': 1660, '大分県': 1660, '宮崎県': 1660,
      '鹿児島県': 1660, '沖縄県': 1350
    },
    80: {
      '北海道': 1030, '青森県': 1280, '岩手県': 1280, '宮城県': 1280, '秋田県': 1280,
      '山形県': 1280, '福島県': 1280, '茨城県': 1440, '栃木県': 1440, '群馬県': 1440,
      '埼玉県': 1440, '千葉県': 1440, '東京都': 1440, '神奈川県': 1440, '新潟県': 1440,
      '富山県': 1590, '石川県': 1590, '福井県': 1590, '山梨県': 1590, '長野県': 1590,
      '岐阜県': 1590, '静岡県': 1590, '愛知県': 1590, '三重県': 1590, '滋賀県': 1750,
      '京都府': 1750, '大阪府': 1750, '兵庫県': 1750, '奈良県': 1750, '和歌山県': 1750,
      '鳥取県': 1900, '島根県': 1900, '岡山県': 1900, '広島県': 1900, '山口県': 1900,
      '徳島県': 1900, '香川県': 1900, '愛媛県': 1900, '高知県': 1900, '福岡県': 2060,
      '佐賀県': 2060, '長崎県': 2060, '熊本県': 2060, '大分県': 2060, '宮崎県': 2060,
      '鹿児島県': 2060, '沖縄県': 1630
    },
    100: {
      '北海道': 1280, '青森県': 1530, '岩手県': 1530, '宮城県': 1530, '秋田県': 1530,
      '山形県': 1530, '福島県': 1530, '茨城県': 1710, '栃木県': 1710, '群馬県': 1710,
      '埼玉県': 1710, '千葉県': 1710, '東京都': 1710, '神奈川県': 1710, '新潟県': 1710,
      '富山県': 1880, '石川県': 1880, '福井県': 1880, '山梨県': 1880, '長野県': 1880,
      '岐阜県': 1880, '静岡県': 1880, '愛知県': 1880, '三重県': 1880, '滋賀県': 2070,
      '京都府': 2070, '大阪府': 2070, '兵庫県': 2070, '奈良県': 2070, '和歌山県': 2070,
      '鳥取県': 2270, '島根県': 2270, '岡山県': 2270, '広島県': 2270, '山口県': 2270,
      '徳島県': 2270, '香川県': 2270, '愛媛県': 2270, '高知県': 2270, '福岡県': 2460,
      '佐賀県': 2460, '長崎県': 2460, '熊本県': 2460, '大分県': 2460, '宮崎県': 2460,
      '鹿児島県': 2460, '沖縄県': 1950
    },
    120: {
      '北海道': 1530, '青森県': 1780, '岩手県': 1780, '宮城県': 1780, '秋田県': 1780,
      '山形県': 1780, '福島県': 1780, '茨城県': 1950, '栃木県': 1950, '群馬県': 1950,
      '埼玉県': 1950, '千葉県': 1950, '東京都': 1950, '神奈川県': 1950, '新潟県': 1950,
      '富山県': 2140, '石川県': 2140, '福井県': 2140, '山梨県': 2140, '長野県': 2140,
      '岐阜県': 2140, '静岡県': 2140, '愛知県': 2140, '三重県': 2140, '滋賀県': 2320,
      '京都府': 2320, '大阪府': 2320, '兵庫県': 2320, '奈良県': 2320, '和歌山県': 2320,
      '鳥取県': 2530, '島根県': 2530, '岡山県': 2530, '広島県': 2530, '山口県': 2530,
      '徳島県': 2530, '香川県': 2530, '愛媛県': 2530, '高知県': 2530, '福岡県': 2740,
      '佐賀県': 2740, '長崎県': 2740, '熊本県': 2740, '大分県': 2740, '宮崎県': 2740,
      '鹿児島県': 2740, '沖縄県': 2260
    },
    140: {
      '北海道': 1780, '青森県': 2020, '岩手県': 2020, '宮城県': 2020, '秋田県': 2020,
      '山形県': 2020, '福島県': 2020, '茨城県': 2200, '栃木県': 2200, '群馬県': 2200,
      '埼玉県': 2200, '千葉県': 2200, '東京都': 2200, '神奈川県': 2200, '新潟県': 2200,
      '富山県': 2390, '石川県': 2390, '福井県': 2390, '山梨県': 2390, '長野県': 2390,
      '岐阜県': 2390, '静岡県': 2390, '愛知県': 2390, '三重県': 2390, '滋賀県': 2580,
      '京都府': 2580, '大阪府': 2580, '兵庫県': 2580, '奈良県': 2580, '和歌山県': 2580,
      '鳥取県': 2780, '島根県': 2780, '岡山県': 2780, '広島県': 2780, '山口県': 2780,
      '徳島県': 2780, '香川県': 2780, '愛媛県': 2780, '高知県': 2780, '福岡県': 2970,
      '佐賀県': 2970, '長崎県': 2970, '熊本県': 2970, '大分県': 2970, '宮崎県': 2970,
      '鹿児島県': 2970, '沖縄県': 2580
    },
    160: {
      '北海道': 2020, '青森県': 2270, '岩手県': 2270, '宮城県': 2270, '秋田県': 2270,
      '山形県': 2270, '福島県': 2270, '茨城県': 2450, '栃木県': 2450, '群馬県': 2450,
      '埼玉県': 2450, '千葉県': 2450, '東京都': 2450, '神奈川県': 2450, '新潟県': 2450,
      '富山県': 2640, '石川県': 2640, '福井県': 2640, '山梨県': 2640, '長野県': 2640,
      '岐阜県': 2640, '静岡県': 2640, '愛知県': 2640, '三重県': 2640, '滋賀県': 2840,
      '京都府': 2840, '大阪府': 2840, '兵庫県': 2840, '奈良県': 2840, '和歌山県': 2840,
      '鳥取県': 3020, '島根県': 3020, '岡山県': 3020, '広島県': 3020, '山口県': 3020,
      '徳島県': 3020, '香川県': 3020, '愛媛県': 3020, '高知県': 3020, '福岡県': 3220,
      '佐賀県': 3220, '長崎県': 3220, '熊本県': 3220, '大分県': 3220, '宮崎県': 3220,
      '鹿児島県': 3220, '沖縄県': 2840
    },
    170: {
      '北海道': 2270, '青森県': 2520, '岩手県': 2520, '宮城県': 2520, '秋田県': 2520,
      '山形県': 2520, '福島県': 2520, '茨城県': 2700, '栃木県': 2700, '群馬県': 2700,
      '埼玉県': 2700, '千葉県': 2700, '東京都': 2700, '神奈川県': 2700, '新潟県': 2700,
      '富山県': 2890, '石川県': 2890, '福井県': 2890, '山梨県': 2890, '長野県': 2890,
      '岐阜県': 2890, '静岡県': 2890, '愛知県': 2890, '三重県': 2890, '滋賀県': 3090,
      '京都府': 3090, '大阪府': 3090, '兵庫県': 3090, '奈良県': 3090, '和歌山県': 3090,
      '鳥取県': 3290, '島根県': 3290, '岡山県': 3290, '広島県': 3290, '山口県': 3290,
      '徳島県': 3290, '香川県': 3290, '愛媛県': 3290, '高知県': 3290, '福岡県': 3470,
      '佐賀県': 3470, '長崎県': 3470, '熊本県': 3470, '大分県': 3470, '宮崎県': 3470,
      '鹿児島県': 3470, '沖縄県': 3090
    }
  }
};

// ゆうパックサイズ制限（実際の仕様）
const YUPACK_SIZE_LIMITS = {
  60: { maxDimension: 60, maxWeight: 2000 },  // 60cm以内、2kg以内
  80: { maxDimension: 80, maxWeight: 5000 },  // 80cm以内、5kg以内
  100: { maxDimension: 100, maxWeight: 10000 }, // 100cm以内、10kg以内
  120: { maxDimension: 120, maxWeight: 15000 }, // 120cm以内、15kg以内
  140: { maxDimension: 140, maxWeight: 20000 }, // 140cm以内、20kg以内
  160: { maxDimension: 160, maxWeight: 25000 }, // 160cm以内、25kg以内
  170: { maxDimension: 170, maxWeight: 25000 }  // 170cm以内、25kg以内
};

// 商品寸法から実際の配送サイズを計算
const calculateActualShippingSize = (cartItems: Array<{ product: { shipping?: { weight?: number; dimensions?: { width: number; height: number; depth: number } }; fragile?: boolean; specialInstructions?: string[] }; quantity: number }>) => {
  let totalWeight = 0;
  let maxWidth = 0, maxHeight = 0, maxDepth = 0;
  let hasFragile = false;
  const specialInstructions: string[] = [];

  // 商品情報を集計
  cartItems.forEach(item => {
    const product = item.product;
    const quantity = item.quantity;
    
    if (product.shipping) {
      // 重量を合計
      if (product.shipping.weight) {
        totalWeight += product.shipping.weight * quantity;
      }
      
      // 割れ物チェック
      if (product.shipping.fragile) {
        hasFragile = true;
      }
      
      // 特別指示を収集
      if (product.shipping.special && !specialInstructions.includes(product.shipping.special)) {
        specialInstructions.push(product.shipping.special);
      }
    }
    
    // 商品寸法（複数個の場合は配置を考慮）
    if (product.dimensions) {
      const itemWidth = product.dimensions.width || 0;
      const itemHeight = product.dimensions.height || 0;
      const itemDepth = product.dimensions.depth || 0;
      
      if (quantity === 1) {
        // 1個の場合はそのまま
        maxWidth = Math.max(maxWidth, itemWidth);
        maxHeight = Math.max(maxHeight, itemHeight);
        maxDepth = Math.max(maxDepth, itemDepth);
      } else {
        // 複数個の場合は効率的な配置を想定
        // 横に並べた場合と縦に積んだ場合を比較
        const horizontalWidth = itemWidth * quantity;
        const stackedHeight = itemHeight * quantity;
        
        if (horizontalWidth <= 170) {
          // 横並びが可能
          maxWidth = Math.max(maxWidth, horizontalWidth);
          maxHeight = Math.max(maxHeight, itemHeight);
          maxDepth = Math.max(maxDepth, itemDepth);
        } else {
          // 縦積みまたは組み合わせ
          maxWidth = Math.max(maxWidth, itemWidth);
          maxHeight = Math.max(maxHeight, stackedHeight);
          maxDepth = Math.max(maxDepth, itemDepth);
        }
      }
    }
  });

  // 梱包材を考慮（各辺に5cm追加）
  const packagingBuffer = 5;
  const finalWidth = maxWidth + packagingBuffer;
  const finalHeight = maxHeight + packagingBuffer;
  const finalDepth = maxDepth + packagingBuffer;
  
  // 3辺の合計でサイズを決定
  const totalDimension = finalWidth + finalHeight + finalDepth;
  
  // 梱包材重量を追加（段ボール等で約200-500g）
  const packagingWeight = Math.max(200, Math.floor(totalWeight * 0.1)); // 商品重量の10%、最低200g
  const finalWeight = totalWeight + packagingWeight;

  return {
    dimensions: { width: finalWidth, height: finalHeight, depth: finalDepth },
    totalDimension,
    totalWeight: finalWeight,
    hasFragile,
    specialInstructions,
    packagingWeight
  };
};

// 適切なゆうパックサイズを決定
const determineYupackSize = (shippingInfo: { totalDimension: number; totalWeight: number }) => {
  const { totalDimension, totalWeight } = shippingInfo;
  
  // サイズと重量の両方をチェック
  for (const [sizeStr, limits] of Object.entries(YUPACK_SIZE_LIMITS)) {
    const size = parseInt(sizeStr);
    if (totalDimension <= limits.maxDimension && totalWeight <= limits.maxWeight) {
      return size;
    }
  }
  
  // どのサイズにも収まらない場合はエラー
  throw new Error(`配送不可: サイズ${totalDimension}cm、重量${(totalWeight/1000).toFixed(1)}kg`);
};

// カートの商品から配送サイズと料金を計算（正確な仕様）
const calculateShippingByProducts = (cartItems: Array<{ product: object; quantity: number }>, prefecture: string, shippingMethodId: string) => {
  if (!cartItems.length) return 0;

  try {
    // 実際の配送サイズを計算
    const shippingInfo = calculateActualShippingSize(cartItems);
    const yupackSize = determineYupackSize(shippingInfo);
    
    // 基本送料を取得
    const sizeKey = yupackSize as keyof typeof SHIPPING_RATES.yupack;
    const prefectureRates = SHIPPING_RATES.yupack[sizeKey];
    
    if (!prefectureRates) {
      throw new Error(`${yupackSize}サイズの料金表が見つかりません`);
    }
    
    const baseCost = prefectureRates[prefecture as keyof typeof prefectureRates];
    if (!baseCost) {
      throw new Error(`${prefecture}の送料が見つかりません`);
    }

    // 速達料金（正確な料金）
    const speedSurcharge = shippingMethodId === 'express' ? 330 : 0;

    // 梱包料金（割れ物の場合）
    const packagingSurcharge = shippingInfo.hasFragile ? 200 : 0;

    const totalCost = baseCost + speedSurcharge + packagingSurcharge;

    return {
      baseCost,
      totalCost,
      yupackSize,
      dimensions: shippingInfo.dimensions,
      totalWeight: shippingInfo.totalWeight,
      packagingWeight: shippingInfo.packagingWeight,
      hasFragile: shippingInfo.hasFragile,
      specialInstructions: shippingInfo.specialInstructions,
      breakdown: {
        base: baseCost,
        speed: speedSurcharge,
        packaging: packagingSurcharge
      },
      // デバッグ情報
      debug: {
        totalDimension: shippingInfo.totalDimension,
        sizeLimit: YUPACK_SIZE_LIMITS[yupackSize as keyof typeof YUPACK_SIZE_LIMITS]
      }
    };
  } catch (error) {
    console.error('配送料計算エラー:', error);
    return {
      error: error instanceof Error ? error.message : '配送料計算に失敗しました',
      totalCost: 0
    };
  }
};

// 最終的な送料計算（割引適用）
const calculateFinalShipping = (subtotal: number, baseShippingCost: number) => {
  const shippingDiscount = subtotal >= 10000 ? 500 : 0;
  const finalShippingCost = Math.max(0, baseShippingCost - shippingDiscount);
  
  return {
    baseShippingCost,
    finalShippingCost,
    shippingDiscount
  };
};

export default function CheckoutPage() {
  const { cart, clearCart, getShippingMethods, setShippingMethod } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [isPostalCodeLoading, setIsPostalCodeLoading] = useState(false);
  const [shippingCalculation, setShippingCalculation] = useState<ShippingCalculationResult>({
    baseShippingCost: 0,
    finalShippingCost: 0,
    shippingDiscount: 0,
    tax: 0,
    total: cart.subtotal
  });
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
    paymentMethod: 'credit_card',
    notes: '',
    newsletter: false,
    terms: false
  });

  const shippingMethods = getShippingMethods();
  const paymentMethods = [
    { id: 'credit_card', name: 'クレジットカード', description: 'Visa, MasterCard, JCB, AMEX' },
    { id: 'bank_transfer', name: '銀行振込', description: '振込手数料はお客様負担' },
    { id: 'cash_on_delivery', name: '代金引換', description: '手数料 ¥300' }
  ];

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

  // 送料・税込合計の再計算（商品の配送情報を考慮）
  React.useEffect(() => {
    if (formData.shippingAddress.state && formData.shippingMethod && cart.items.length > 0) {
      const shippingData = calculateShippingByProducts(cart.items, formData.shippingAddress.state, formData.shippingMethod);
      
      if (typeof shippingData === 'object') {
        const { finalShippingCost, shippingDiscount } = calculateFinalShipping(cart.subtotal, shippingData.totalCost);
        const tax = Math.floor((cart.subtotal + finalShippingCost) * 0.1);
        const total = cart.subtotal + finalShippingCost + tax;
        
        setShippingCalculation({
          baseShippingCost: shippingData.totalCost,
          finalShippingCost,
          shippingDiscount,
          tax,
          total,
          shippingDetails: shippingData // 詳細情報を保存
        });
      }
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
  }, [formData.shippingAddress.state, formData.shippingMethod, cart.items, cart.subtotal]);

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
            <Link href="/products">
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
    setIsProcessing(true);

    try {
      // 注文データの準備
      const orderData = {
        customer: formData.customer,
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
        items: cart.items,
        shippingMethod: formData.shippingMethod,
        paymentMethod: formData.paymentMethod,
        pricing: shippingCalculation,
        notes: formData.notes,
        newsletter: formData.newsletter
      };

      // 支払い方法による分岐
      if (formData.paymentMethod !== 'credit_card') {
        // 銀行振込・代金引換の場合：注文確定処理
        await processNonCardPayment(orderData);
        setOrderComplete(true);
        clearCart();
      }
      // クレジットカード決済の場合はコンポーネントで処理
    } catch (error) {
      console.error('Order processing failed:', error);
      alert('注文の処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 非カード決済の処理（振込・代金引換）
  const processNonCardPayment = async (orderData: { customer: object; items: object; pricing: object; paymentMethod: object; shippingAddress: object }) => {
    // ここでは注文処理をシミュレート
    // 実際の実装では、APIに注文データを送信
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // SendGridを使用してメール送信
    await sendOrderConfirmationEmails(orderData);
    
    console.log('Order processed:', orderData);
  };

  // メール送信処理（API経由）
  const sendOrderConfirmationEmails = async (orderData: { customer: object; items: object; pricing: object; paymentMethod: object; shippingAddress: object }) => {
    try {
      // API経由でメール送信（サーバーサイド処理）
      const response = await fetch('/api/email/order-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: orderData.customer,
          items: orderData.items,
          pricing: orderData.pricing,
          paymentMethod: orderData.paymentMethod,
          shippingAddress: orderData.shippingAddress
        })
      });

      if (response.ok) {
        console.log('✅ 注文確認メール送信成功');
      } else {
        console.warn('⚠️ メール送信失敗');
      }
    } catch (error) {
      console.error('メール送信エラー:', error);
      // メール送信エラーでも注文処理は継続
    }
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
        <div className="py-8">
          <div className="border-b border-stone-800 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-white">
              チェックアウト
            </h1>
          </div>

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
                                const shippingData = calculateShippingByProducts(cart.items, formData.shippingAddress.state, method.id);
                                if (typeof shippingData === 'object') {
                                  const { finalShippingCost } = calculateFinalShipping(cart.subtotal, shippingData.totalCost);
                                  return finalShippingCost === 0 ? '無料' : `¥${finalShippingCost.toLocaleString()}`;
                                }
                                return '計算中...';
                              })() : '住所入力後に計算'}
                            </span>
                          </div>
                          <p className="text-stone-400 text-sm">
                            {method.description}
                            {formData.shippingAddress.state && cart.items.length > 0 && (() => {
                              const shippingData = calculateShippingByProducts(cart.items, formData.shippingAddress.state, method.id);
                              if (typeof shippingData === 'object') {
                                return ` (サイズ${shippingData.yupackSize})`;
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
                            <Link href={`/products/${item.product.slug.current}`}>
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
                            <Link href={`/products/${item.product.slug.current}`}>
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
                              <span>ゆうパック{shippingCalculation.shippingDetails.yupackSize}サイズ</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span>梱包サイズ</span>
                              <span>
                                {Math.ceil(shippingCalculation.shippingDetails.dimensions?.width || 0)}×
                                {Math.ceil(shippingCalculation.shippingDetails.dimensions?.height || 0)}×
                                {Math.ceil(shippingCalculation.shippingDetails.dimensions?.depth || 0)}cm
                              </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span>総重量（梱包込）</span>
                              <span>{((shippingCalculation.shippingDetails.totalWeight || 0) / 1000).toFixed(1)}kg</span>
                            </div>
                            {(shippingCalculation.shippingDetails.breakdown?.packaging || 0) > 0 && (
                              <div className="flex justify-between items-center mb-1">
                                <span>⚠️ 梱包料金</span>
                                <span>+¥{shippingCalculation.shippingDetails.breakdown?.packaging}</span>
                              </div>
                            )}
                            {(shippingCalculation.shippingDetails.breakdown?.speed || 0) > 0 && (
                              <div className="flex justify-between items-center">
                                <span>速達料金</span>
                                <span>+¥{shippingCalculation.shippingDetails.breakdown?.speed}</span>
                              </div>
                            )}
                            {process.env.NODE_ENV === 'development' && shippingCalculation.shippingDetails.debug && (
                              <div className="mt-2 pt-2 border-t border-stone-700">
                                <div className="flex justify-between items-center text-blue-400">
                                  <span>3辺合計</span>
                                  <span>{shippingCalculation.shippingDetails.debug.totalDimension}cm</span>
                                </div>
                                <div className="flex justify-between items-center text-blue-400">
                                  <span>サイズ制限</span>
                                  <span>
                                    {shippingCalculation.shippingDetails.debug.sizeLimit.maxDimension}cm / 
                                    {(shippingCalculation.shippingDetails.debug.sizeLimit.maxWeight / 1000)}kg
                                  </span>
                                </div>
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
                        <div className="flex justify-between text-stone-300">
                          <span>消費税</span>
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
                        ...shippingCalculation,
                        items: cart.items
                      }}
                      customerData={formData.customer}
                      orderData={{
                        shippingAddress: formData.shippingAddress,
                        billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
                        shippingMethod: formData.shippingMethod,
                        sameAsShipping: formData.sameAsShipping,
                        terms: formData.terms,
                        newsletter: formData.newsletter,
                        notes: formData.notes
                      }}
                      mode="embedded"
                    />
                  ) : (
                    <Button 
                      type="submit"
                      variant="primary" 
                      size="lg" 
                      className="w-full py-4 text-lg font-medium"
                      disabled={isProcessing || !formData.terms}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          注文処理中...
                        </div>
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