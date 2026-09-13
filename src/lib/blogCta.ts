export const BLOG_CTA_LABEL_MAX_LENGTH = 60;
export const BLOG_CTA_URL_MAX_LENGTH = 2048;
export const BLOG_CTA_MAX_ITEMS = 5;

export interface BlogCtaProductReference {
  _type?: 'reference';
  _ref?: string;
}

export interface BlogCtaProductProjection {
  _id?: string;
  name?: string;
  slug?: { current?: string };
  images?: unknown[];
  isVisible?: boolean;
}

export interface BlogCtaInput {
  _key?: string;
  label?: string | null;
  url?: string | null;
  product?: BlogCtaProductReference | BlogCtaProductProjection | null;
}

export interface BlogCtaFields {
  ctaLinks?: BlogCtaInput[] | null;
  /** 1個用だった旧形式。既存記事の表示互換性のため読み取りだけ継続する */
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export interface ResolvedBlogCta {
  key: string;
  label: string;
  url: string;
  external: boolean;
  product?: {
    id: string;
    name: string;
    image?: unknown;
  };
}

type BlogCtaValidation =
  | { ok: true; fields: BlogCtaFields }
  | { ok: false; error: string };

export function normalizeBlogCtaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || url.length > BLOG_CTA_URL_MAX_LENGTH || /\s/.test(url)) return null;

  // サイト内リンクは /shop/... のような絶対パスだけを許可する。
  // //example.com は外部URLとして解釈されるため除外する。
  if (url.startsWith('/') && !url.startsWith('//')) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function normalizedKey(value: unknown, index: number, usedKeys: Set<string>): string {
  const requested = typeof value === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(value)
    ? value
    : `cta-${index + 1}`;
  let key = requested;
  let suffix = 2;
  while (usedKeys.has(key)) key = `${requested}-${suffix++}`;
  usedKeys.add(key);
  return key;
}

function productReference(value: BlogCtaInput['product']): BlogCtaProductReference | null {
  if (!value || typeof value !== 'object' || !('_ref' in value)) return null;
  const ref = typeof value._ref === 'string' ? value._ref.trim() : '';
  if (!ref || !/^[a-zA-Z0-9._-]+$/.test(ref)) return null;
  return { _type: 'reference', _ref: ref };
}

function projectedProduct(value: BlogCtaInput['product']): BlogCtaProductProjection | null {
  if (!value || typeof value !== 'object' || !('_id' in value)) return null;
  return value;
}

export function normalizeBlogCtaFields(input: BlogCtaFields): BlogCtaValidation {
  const hasLinks = Object.prototype.hasOwnProperty.call(input, 'ctaLinks');
  const hasLegacyLabel = Object.prototype.hasOwnProperty.call(input, 'ctaLabel');
  const hasLegacyUrl = Object.prototype.hasOwnProperty.call(input, 'ctaUrl');
  if (!hasLinks && !hasLegacyLabel && !hasLegacyUrl) return { ok: true, fields: {} };
  if (hasLinks && input.ctaLinks != null && !Array.isArray(input.ctaLinks)) {
    return { ok: false, error: '案内ボタンの形式が正しくありません' };
  }

  const source: BlogCtaInput[] = hasLinks
    ? (input.ctaLinks || [])
    : [{ label: input.ctaLabel, url: input.ctaUrl }];
  if (source.length > BLOG_CTA_MAX_ITEMS) {
    return { ok: false, error: `案内ボタンは最大${BLOG_CTA_MAX_ITEMS}個まで設定できます` };
  }

  const usedKeys = new Set<string>();
  const links: BlogCtaInput[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    const rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
    const product = productReference(item?.product);
    if (!label && !rawUrl && !product) continue;
    if (!label) {
      return { ok: false, error: `${index + 1}個目のボタンに表示する文字を入力してください` };
    }
    if (label.length > BLOG_CTA_LABEL_MAX_LENGTH) {
      return { ok: false, error: `${index + 1}個目のボタン文字は${BLOG_CTA_LABEL_MAX_LENGTH}文字以内で入力してください` };
    }
    if (!product && !rawUrl) {
      return { ok: false, error: `${index + 1}個目のボタンは、商品または移動先URLを設定してください` };
    }
    const url = product ? null : normalizeBlogCtaUrl(rawUrl);
    if (!product && !url) {
      return { ok: false, error: `${index + 1}個目の移動先URLは、/ から始まるサイト内URLまたは https:// URLを入力してください` };
    }
    links.push({
      _key: normalizedKey(item._key, index, usedKeys),
      label,
      url,
      product,
    });
  }

  // 複数形式へ保存した時点で旧形式を空にし、表示の二重化を防ぐ。
  return { ok: true, fields: { ctaLinks: links, ctaLabel: null, ctaUrl: null } };
}

export function getBlogCtaInputs(fields: BlogCtaFields): BlogCtaInput[] {
  if (Array.isArray(fields.ctaLinks) && fields.ctaLinks.length > 0) {
    return fields.ctaLinks.slice(0, BLOG_CTA_MAX_ITEMS).map((item, index) => ({
      _key: item._key || `cta-${index + 1}`,
      label: typeof item.label === 'string' ? item.label : '',
      url: typeof item.url === 'string' ? item.url : '',
      product: item.product || null,
    }));
  }
  if (fields.ctaLabel || fields.ctaUrl) {
    return [{ _key: 'legacy-cta', label: fields.ctaLabel || '', url: fields.ctaUrl || '' }];
  }
  return [];
}

export function getBlogCtas(fields: BlogCtaFields): ResolvedBlogCta[] {
  const source = getBlogCtaInputs(fields);
  const usedKeys = new Set<string>();
  const links: ResolvedBlogCta[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    if (!label || label.length > BLOG_CTA_LABEL_MAX_LENGTH) continue;

    const product = projectedProduct(item.product);
    if (product) {
      const slug = typeof product.slug?.current === 'string' ? product.slug.current.trim() : '';
      const url = normalizeBlogCtaUrl(slug ? `/shop/${slug}` : '');
      if (product.isVisible === false || !product._id || !product.name || !url) continue;
      links.push({
        key: normalizedKey(item._key, index, usedKeys),
        label,
        url,
        external: false,
        product: {
          id: product._id,
          name: product.name,
          image: Array.isArray(product.images) ? product.images[0] : undefined,
        },
      });
      continue;
    }

    // 商品参照があるのに展開できなかった場合は、削除・非公開商品の可能性があるため表示しない。
    if (productReference(item.product)) continue;
    const url = normalizeBlogCtaUrl(item.url);
    if (!url) continue;
    links.push({
      key: normalizedKey(item._key, index, usedKeys),
      label,
      url,
      external: !url.startsWith('/'),
    });
  }
  return links;
}
