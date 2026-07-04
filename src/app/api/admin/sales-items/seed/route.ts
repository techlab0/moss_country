import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

// 紙の売上集計表にある全項目を初期投入する（既存の同名項目はスキップ、何度呼んでも安全）
const SEED_ITEMS: Array<{
  category: string;
  name: string;
  pricingType: 'fixed' | 'variable';
  unitPrice?: number;
  sortOrder: number;
}> = [
  // コケ
  { category: 'moss', name: 'ハイゴケ(大)', pricingType: 'fixed', unitPrice: 800, sortOrder: 1 },
  { category: 'moss', name: 'ハイゴケ(小)', pricingType: 'fixed', unitPrice: 600, sortOrder: 2 },
  { category: 'moss', name: 'スナゴケ(大)', pricingType: 'fixed', unitPrice: 800, sortOrder: 3 },
  { category: 'moss', name: 'スナゴケ(小)', pricingType: 'fixed', unitPrice: 600, sortOrder: 4 },
  { category: 'moss', name: 'タマゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 5 },
  { category: 'moss', name: 'タマゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 6 },
  { category: 'moss', name: 'カモジゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 7 },
  { category: 'moss', name: 'カモジゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 8 },
  { category: 'moss', name: 'ヤマゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 9 },
  { category: 'moss', name: 'ヤマゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 10 },
  { category: 'moss', name: 'チョウチンゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 11 },
  { category: 'moss', name: 'チョウチンゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 12 },
  { category: 'moss', name: 'シノブゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 13 },
  { category: 'moss', name: 'シノブゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 14 },
  { category: 'moss', name: 'コツボゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 15 },
  { category: 'moss', name: 'コツボゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 16 },
  { category: 'moss', name: 'ヒノキゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 17 },
  { category: 'moss', name: 'ヒノキゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 18 },
  { category: 'moss', name: 'ツヤゴケ(大)', pricingType: 'fixed', unitPrice: 700, sortOrder: 19 },
  { category: 'moss', name: 'ツヤゴケ(小)', pricingType: 'fixed', unitPrice: 500, sortOrder: 20 },
  { category: 'moss', name: 'ホウオウゴケ', pricingType: 'fixed', unitPrice: 750, sortOrder: 21 },
  { category: 'moss', name: 'カサゴケ', pricingType: 'fixed', unitPrice: 660, sortOrder: 22 },
  { category: 'moss', name: 'コウヤノマンネングサ', pricingType: 'fixed', unitPrice: 660, sortOrder: 23 },
  // 商品（価格は都度変動）
  { category: 'product', name: '容器', pricingType: 'variable', sortOrder: 1 },
  { category: 'product', name: '容器フタ', pricingType: 'variable', sortOrder: 2 },
  { category: 'product', name: '石', pricingType: 'variable', sortOrder: 3 },
  { category: 'product', name: '流木', pricingType: 'variable', sortOrder: 4 },
  // フィギュア（価格帯）
  { category: 'figure', name: '100円', pricingType: 'fixed', unitPrice: 100, sortOrder: 1 },
  { category: 'figure', name: '200円', pricingType: 'fixed', unitPrice: 200, sortOrder: 2 },
  { category: 'figure', name: '300円', pricingType: 'fixed', unitPrice: 300, sortOrder: 3 },
  { category: 'figure', name: '400円', pricingType: 'fixed', unitPrice: 400, sortOrder: 4 },
  // ワークショップ（価格帯）
  { category: 'workshop', name: '1500円プラン', pricingType: 'fixed', unitPrice: 1500, sortOrder: 1 },
  { category: 'workshop', name: '2000円プラン', pricingType: 'fixed', unitPrice: 2000, sortOrder: 2 },
  { category: 'workshop', name: '2500円プラン', pricingType: 'fixed', unitPrice: 2500, sortOrder: 3 },
  { category: 'workshop', name: '4000円プラン', pricingType: 'fixed', unitPrice: 4000, sortOrder: 4 },
  { category: 'workshop', name: '4500円プラン', pricingType: 'fixed', unitPrice: 4500, sortOrder: 5 },
  // ガチャ
  { category: 'gacha', name: 'ガチャ', pricingType: 'fixed', unitPrice: 500, sortOrder: 1 },
  // 作品（価格は都度変動）
  { category: 'other', name: '作品', pricingType: 'variable', sortOrder: 1 },
];

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const existing: Array<{ name: string; category: string }> = await writeClient.fetch(
      `*[_type == "salesItem"]{ name, category }`
    );
    const existingKeys = new Set(existing.map(item => `${item.category}::${item.name}`));

    const toCreate = SEED_ITEMS.filter(item => !existingKeys.has(`${item.category}::${item.name}`));

    const created = await Promise.all(
      toCreate.map(item =>
        writeClient.create({
          _type: 'salesItem',
          category: item.category,
          name: item.name,
          pricingType: item.pricingType,
          unitPrice: item.pricingType === 'fixed' ? item.unitPrice : undefined,
          sortOrder: item.sortOrder,
          isActive: true,
        })
      )
    );

    return NextResponse.json({
      success: true,
      createdCount: created.length,
      skippedCount: SEED_ITEMS.length - toCreate.length,
    });
  } catch (error) {
    console.error('売上項目シードエラー:', error);
    return NextResponse.json(
      { error: '初期データの投入に失敗しました' },
      { status: 500 }
    );
  }
}
