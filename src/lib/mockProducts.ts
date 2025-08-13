/**
 * モック商品データ（開発・テスト用）
 * Sanityデータがない場合の代替データ
 */

import type { Product } from '@/types/sanity';

export const mockProducts: Product[] = [
  {
    _id: 'mock-1',
    _type: 'product',
    name: '森の小径テラリウム',
    slug: {
      current: 'forest-path-terrarium',
      _type: 'slug'
    },
    price: 3800,
    description: '美しい苔と小さな道が作り出す幻想的な森の世界。初心者の方にもおすすめの一品です。',
    category: '初心者向け',
    images: [],
    featured: true,
    inStock: true,
    dimensions: {
      width: 12,
      height: 15,
      depth: 12
    },
    materials: ['ガラス容器', '北海道産苔', '天然石', '活性炭'],
    careInstructions: '週に1-2回霧吹きで水分補給してください。直射日光は避け、明るい室内に置いてください。',
    sortOrder: 1,
    shipping: {
      carrier: 'yupack',
      weight: 800,
      fragile: true
    }
  },
  {
    _id: 'mock-2',
    _type: 'product',
    name: '妖精の庭テラリウム',
    slug: {
      current: 'fairy-garden-terrarium',
      _type: 'slug'
    },
    price: 5200,
    description: '小さなフィギュアと色とりどりの苔で作られた可愛らしい妖精の世界。',
    category: 'プレミアム',
    images: [],
    featured: true,
    inStock: true,
    dimensions: {
      width: 15,
      height: 18,
      depth: 15
    },
    materials: ['ガラス容器', '特選苔', 'ミニチュアフィギュア', '装飾石'],
    careInstructions: '2週間に1回程度、霧吹きで軽く湿らせてください。フィギュアは水に濡らさないよう注意。',
    sortOrder: 2,
    shipping: {
      carrier: 'yupack',
      weight: 1200,
      fragile: true
    }
  },
  {
    _id: 'mock-3',
    _type: 'product',
    name: 'ミニマル苔庭',
    slug: {
      current: 'minimal-moss-garden',
      _type: 'slug'
    },
    price: 2800,
    description: 'シンプルで美しい苔だけのテラリウム。デスクやリビングのアクセントに最適。',
    category: '初心者向け',
    images: [],
    featured: false,
    inStock: true,
    dimensions: {
      width: 10,
      height: 12,
      depth: 10
    },
    materials: ['ガラス容器', '北海道産苔', '白砂'],
    careInstructions: '月に2-3回霧吹きで水分を与えてください。とても手入れが簡単です。',
    sortOrder: 3,
    shipping: {
      carrier: 'yupack',
      weight: 600,
      fragile: true
    }
  },
  {
    _id: 'mock-4',
    _type: 'product',
    name: '古城の遺跡テラリウム',
    slug: {
      current: 'castle-ruins-terrarium',
      _type: 'slug'
    },
    price: 7800,
    description: '古い城の遺跡をモチーフにした重厚で神秘的なテラリウム。上級者向けの逸品。',
    category: 'プレミアム',
    images: [],
    featured: true,
    inStock: true,
    dimensions: {
      width: 20,
      height: 25,
      depth: 18
    },
    materials: ['大型ガラス容器', 'プレミアム苔', '天然石城モチーフ', '特殊装飾土'],
    careInstructions: '週に1回霧吹きでメンテナンス。湿度管理が重要です。',
    sortOrder: 4,
    shipping: {
      carrier: 'yupack',
      weight: 2500,
      fragile: true,
      special: '天地無用・取扱注意'
    }
  },
  {
    _id: 'mock-5',
    _type: 'product',
    name: 'ハートシェイプ・ラブテラリウム',
    slug: {
      current: 'heart-love-terrarium',
      _type: 'slug'
    },
    price: 4500,
    description: 'ハート型の容器に入った愛らしいテラリウム。プレゼントやギフトに人気です。',
    category: 'ギフト',
    images: [],
    featured: false,
    inStock: true,
    dimensions: {
      width: 14,
      height: 12,
      depth: 8
    },
    materials: ['ハート型ガラス容器', 'ピンク系苔', '小さな花', 'パール装飾'],
    careInstructions: '優しく霧吹きで水やり。直射日光を避けて飾ってください。',
    sortOrder: 5,
    shipping: {
      carrier: 'yupack',
      weight: 700,
      fragile: true
    }
  },
  {
    _id: 'mock-6',
    _type: 'product',
    name: '水晶の洞窟テラリウム【完売】',
    slug: {
      current: 'crystal-cave-terrarium',
      _type: 'slug'
    },
    price: 6800,
    description: '美しい水晶と神秘的な苔で作られた洞窟をモチーフにしたテラリウム。現在品切れ中です。',
    category: 'プレミアム',
    images: [],
    featured: false,
    inStock: false,
    dimensions: {
      width: 18,
      height: 20,
      depth: 16
    },
    materials: ['特殊ガラス容器', '天然水晶', 'プレミアム苔', '洞窟風装飾石'],
    careInstructions: '週に1回霧吹きでメンテナンス。水晶部分は乾いた布で清拭してください。',
    sortOrder: 2.5,
    shipping: {
      carrier: 'yupack',
      weight: 1800,
      fragile: true,
      special: '水晶取扱注意'
    }
  }
];