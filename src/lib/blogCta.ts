export const BLOG_CTA_LABEL_MAX_LENGTH = 60;
export const BLOG_CTA_URL_MAX_LENGTH = 2048;
export const BLOG_CTA_MAX_ITEMS = 5;

export interface BlogCtaInput {
  _key?: string;
  label?: string | null;
  url?: string | null;
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
  while (usedKeys.has(key)) {
    key = `${requested}-${suffix++}`;
  }
  usedKeys.add(key);
  return key;
}

function normalizeOneCta(item: BlogCtaInput, index: number, usedKeys: Set<string>): ResolvedBlogCta | string | null {
  const label = typeof item?.label === 'string' ? item.label.trim() : '';
  const rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
  if (!label && !rawUrl) return null;
  if (!label || !rawUrl) return `${index + 1}個目のボタンは、表示文字と移動先URLを両方入力してください`;
  if (label.length > BLOG_CTA_LABEL_MAX_LENGTH) {
    return `${index + 1}個目のボタン文字は${BLOG_CTA_LABEL_MAX_LENGTH}文字以内で入力してください`;
  }
  const url = normalizeBlogCtaUrl(rawUrl);
  if (!url) {
    return `${index + 1}個目の移動先URLは、/ から始まるサイト内URLまたは https:// URLを入力してください`;
  }
  return {
    key: normalizedKey(item._key, index, usedKeys),
    label,
    url,
    external: !url.startsWith('/'),
  };
}

export function normalizeBlogCtaFields(input: BlogCtaFields): BlogCtaValidation {
  const hasLinks = Object.prototype.hasOwnProperty.call(input, 'ctaLinks');
  const hasLegacyLabel = Object.prototype.hasOwnProperty.call(input, 'ctaLabel');
  const hasLegacyUrl = Object.prototype.hasOwnProperty.call(input, 'ctaUrl');
  if (!hasLinks && !hasLegacyLabel && !hasLegacyUrl) return { ok: true, fields: {} };

  const source: BlogCtaInput[] = hasLinks
    ? (Array.isArray(input.ctaLinks) ? input.ctaLinks : [])
    : [{ label: input.ctaLabel, url: input.ctaUrl }];
  if (source.length > BLOG_CTA_MAX_ITEMS) {
    return { ok: false, error: `案内ボタンは最大${BLOG_CTA_MAX_ITEMS}個まで設定できます` };
  }

  const usedKeys = new Set<string>();
  const links: Array<{ _key: string; label: string; url: string }> = [];
  for (let index = 0; index < source.length; index += 1) {
    const result = normalizeOneCta(source[index], index, usedKeys);
    if (typeof result === 'string') return { ok: false, error: result };
    if (result) links.push({ _key: result.key, label: result.label, url: result.url });
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
    const result = normalizeOneCta(source[index], index, usedKeys);
    if (result && typeof result !== 'string') links.push(result);
  }
  return links;
}
