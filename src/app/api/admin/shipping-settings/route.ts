import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import {
  getShippingSettings,
  invalidateShippingSettingsCache,
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings,
  type CarrierId,
} from '@/lib/shipping';

const DOC_ID = 'shippingSettings';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    // マージ済みの現行設定を返す（未保存時はデフォルトが入るので管理画面はそれを初期表示できる）
    const settings = await getShippingSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('送料設定の取得に失敗:', error);
    return NextResponse.json({ error: '送料設定の取得に失敗しました' }, { status: 500 });
  }
}

// 送料設定を丸ごと保存する。改ざん防止のため送料計算はサーバーがこの設定を正として行う。
export async function PUT(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const incoming = body?.settings as Partial<ShippingSettings> | undefined;
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: '設定データが不正です' }, { status: 400 });
    }

    const validation = validateSettings(incoming);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const doc = {
      ...validation.value,
      _id: DOC_ID,
      _type: 'shippingSettings',
      updatedAt: new Date().toISOString(),
    };

    await writeClient.createOrReplace(doc);
    invalidateShippingSettingsCache();

    const settings = await getShippingSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('送料設定の保存に失敗:', error);
    return NextResponse.json({ error: '送料設定の保存に失敗しました' }, { status: 500 });
  }
}

// 保存前の最小限のサニタイズ・検証。壊れた設定で送料計算が破綻しないよう、
// 数値・配列の形と非負を確認し、欠損はデフォルトで補完する。
function validateSettings(
  input: Partial<ShippingSettings>
): { ok: true; value: ShippingSettings } | { ok: false; error: string } {
  const d = DEFAULT_SHIPPING_SETTINGS;

  const carrier: CarrierId = input.carrier === 'yamato' || input.carrier === 'yupack' ? input.carrier : d.carrier;

  const zones = Array.isArray(input.zones) && input.zones.length > 0 ? input.zones : d.zones;
  if (
    !zones.every(
      (z) => z && typeof z.id === 'string' && typeof z.name === 'string' && Array.isArray(z.prefectures)
    )
  ) {
    return { ok: false, error: 'ゾーン定義の形式が不正です' };
  }

  const carriers = input.carriers ?? d.carriers;
  for (const key of ['yupack', 'yamato'] as CarrierId[]) {
    const table = carriers[key];
    if (!table) continue;
    if (!Array.isArray(table.sizeTiers) || !Array.isArray(table.rates)) {
      return { ok: false, error: `${key} の料金表の形式が不正です` };
    }
    const badRate = table.rates.find(
      (r) => typeof r.zoneId !== 'string' || !Number.isFinite(r.size) || !(Number(r.price) >= 0)
    );
    if (badRate) {
      return { ok: false, error: `${key} の料金に負の値または不正な値があります` };
    }
    const badTier = table.sizeTiers.find(
      (t) => !Number.isFinite(t.size) || !(Number(t.maxDimensionSum) >= 0) || !(Number(t.maxWeight) >= 0)
    );
    if (badTier) {
      return { ok: false, error: `${key} のサイズ区分に不正な値があります` };
    }
  }

  const nonNegative = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;

  return {
    ok: true,
    value: {
      carrier,
      zones,
      carriers: {
        yupack: carriers.yupack ?? d.carriers.yupack,
        yamato: carriers.yamato ?? d.carriers.yamato,
      },
      freeShippingMode: typeof input.freeShippingMode === 'boolean' ? input.freeShippingMode : d.freeShippingMode,
      freeShippingThreshold: nonNegative(input.freeShippingThreshold, d.freeShippingThreshold),
      shippingDiscount: nonNegative(input.shippingDiscount, d.shippingDiscount),
      expressSurcharge: nonNegative(input.expressSurcharge, d.expressSurcharge),
      fragileSurcharge: nonNegative(input.fragileSurcharge, d.fragileSurcharge),
      packagingBufferCm: nonNegative(input.packagingBufferCm, d.packagingBufferCm),
      packagingWeightG: nonNegative(input.packagingWeightG, d.packagingWeightG),
    },
  };
}
