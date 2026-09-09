// ページ別の meta description。
//
// 既定値はここに集約し、各ページの layout.tsx と管理画面（/admin/settings のSEOタブ）が
// 同じ値を参照する。管理画面で入力があればそちらを優先し、空欄なら既定値へ戻す。
// 商品・ブログ・苔図鑑のような件数の多いページはここでは扱わず、
// それぞれのドキュメントの内容から自動生成する（src/lib/metaDescription.ts）。

export interface PageSeoEntry {
  path: string;
  description: string;
}

export interface EditablePage {
  /** 先頭スラッシュ付きのパス。siteSettings への保存キーになる */
  path: string;
  /** 管理画面に出す見出し */
  label: string;
  /** 未入力のときに使う既定の説明文 */
  autoDescription: string;
}

/**
 * 管理画面から description を編集できるページ。
 *
 * トップページは「サイト説明文」がそのまま description になるため、ここには含めない。
 * カート・注文手続き・予約などの noindex ページも検索結果に出ないため対象外。
 */
export const editablePages: EditablePage[] = [
  {
    path: '/shop',
    label: 'オンラインショップ',
    autoDescription:
      '北海道の自然から生まれた苔テラリウムのオンラインショップ。完成品テラリウム、苔、資材、ギフトまで。ひとつひとつ手作りの作品を全国へお届けします。',
  },
  {
    path: '/workshop',
    label: 'ワークショップ',
    autoDescription:
      '自分の手で作る、特別なテラリウム体験。MOSS COUNTRYの職人が丁寧に指導する本格的なテラリウム制作ワークショップ。初心者からお子様まで、どなたでもお楽しみいただけます。',
  },
  {
    path: '/workshop/mobile',
    label: '出張ワークショップ',
    autoDescription:
      'MOSS COUNTRYの職人が会場までうかがう出張ワークショップ。企業イベント、学校、地域イベント、福利厚生など、人数や会場に合わせてご提案します。',
  },
  {
    path: '/moss-guide',
    label: '苔図鑑',
    autoDescription:
      'テラリウムに使用される様々な苔の種類と特徴をご紹介。育成難易度、水分要求量、光の条件など、苔選びに役立つ詳細情報が満載です。苔の魅力的な世界を探検しましょう。',
  },
  {
    path: '/blog',
    label: 'ブログ・ニュース',
    autoDescription:
      'MOSS COUNTRYからの最新情報、イベント出店のお知らせ、テラリウムのお手入れ方法、新商品のご紹介などをお届けします。苔テラリウムの世界をもっと深く知ることができるコンテンツが満載です。',
  },
  {
    path: '/store',
    label: '店舗情報・アクセス',
    autoDescription:
      '札幌市西区にあるMOSS COUNTRYの店舗情報とアクセス方法。営業時間、定休日、駐車場情報、電話番号など詳細情報をご案内。お気軽にお越しください。',
  },
  {
    path: '/story',
    label: 'ブランドストーリー',
    autoDescription:
      '小さな緑に込めた、大きな想い。北海道の自然に魅せられたMOSS COUNTRYが、苔テラリウム専門店として大切にしている価値観と歩みをご紹介します。',
  },
  {
    path: '/faq',
    label: 'よくあるご質問',
    autoDescription:
      '苔テラリウムのお手入れ、ご注文・配送、ワークショップのご予約など、MOSS COUNTRY によく寄せられるご質問と回答をまとめました。',
  },
  {
    path: '/contact',
    label: 'お問い合わせ',
    autoDescription:
      'MOSS COUNTRYへのお問い合わせページ。商品・ワークショップ・出張依頼・法人のご相談など、お気軽にご連絡ください。',
  },
];

/** 既定の説明文。未登録のパスは空文字を返す。 */
export function autoDescriptionFor(path: string): string {
  return editablePages.find((p) => p.path === path)?.autoDescription ?? '';
}

/**
 * 保存値を正規化する。
 * 空欄は「未入力」とみなして落とし、読み出し時に既定値へ倒れるようにする。
 */
export function sanitizePageSeo(input: unknown): PageSeoEntry[] {
  if (!Array.isArray(input)) return [];
  const known = new Set(editablePages.map((p) => p.path));
  const seen = new Set<string>();
  const entries: PageSeoEntry[] = [];

  for (const raw of input) {
    const path = typeof (raw as PageSeoEntry)?.path === 'string' ? (raw as PageSeoEntry).path.trim() : '';
    const description =
      typeof (raw as PageSeoEntry)?.description === 'string' ? (raw as PageSeoEntry).description.trim() : '';
    // 編集画面に無いパスを保存できてしまうと、どのページに効いているのか追えなくなる
    if (!known.has(path) || seen.has(path) || description === '') continue;
    seen.add(path);
    entries.push({ path, description });
  }

  return entries;
}

/** 保存値があればそれを、無ければ既定値を返す。 */
export function resolvePageDescription(
  path: string,
  overrides: Array<{ path?: string | null; description?: string | null }> | null | undefined
): string {
  const saved = overrides?.find((o) => o?.path === path)?.description;
  const trimmed = typeof saved === 'string' ? saved.trim() : '';
  return trimmed === '' ? autoDescriptionFor(path) : trimmed;
}
