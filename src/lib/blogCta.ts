export const BLOG_CTA_LABEL_MAX_LENGTH = 60;
export const BLOG_CTA_URL_MAX_LENGTH = 2048;

export interface BlogCtaFields {
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

type BlogCtaValidation =
  | { ok: true; fields: BlogCtaFields }
  | { ok: false; error: string };

export function normalizeBlogCtaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || url.length > BLOG_CTA_URL_MAX_LENGTH) return null;

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

export function normalizeBlogCtaFields(input: BlogCtaFields): BlogCtaValidation {
  const hasLabel = Object.prototype.hasOwnProperty.call(input, 'ctaLabel');
  const hasUrl = Object.prototype.hasOwnProperty.call(input, 'ctaUrl');
  if (!hasLabel && !hasUrl) return { ok: true, fields: {} };

  const label = typeof input.ctaLabel === 'string' ? input.ctaLabel.trim() : '';
  const rawUrl = typeof input.ctaUrl === 'string' ? input.ctaUrl.trim() : '';

  if (!label && !rawUrl) {
    return { ok: true, fields: { ctaLabel: null, ctaUrl: null } };
  }
  if (!label || !rawUrl) {
    return { ok: false, error: '案内ボタンの文字と移動先URLを両方入力してください' };
  }
  if (label.length > BLOG_CTA_LABEL_MAX_LENGTH) {
    return { ok: false, error: `案内ボタンの文字は${BLOG_CTA_LABEL_MAX_LENGTH}文字以内で入力してください` };
  }

  const url = normalizeBlogCtaUrl(rawUrl);
  if (!url) {
    return { ok: false, error: '移動先URLは / から始まるサイト内URL、または https:// URLを入力してください' };
  }

  return { ok: true, fields: { ctaLabel: label, ctaUrl: url } };
}

export function getBlogCta(fields: BlogCtaFields): { label: string; url: string; external: boolean } | null {
  const label = typeof fields.ctaLabel === 'string' ? fields.ctaLabel.trim() : '';
  const url = normalizeBlogCtaUrl(fields.ctaUrl);
  if (!label || label.length > BLOG_CTA_LABEL_MAX_LENGTH || !url) return null;

  return { label, url, external: !url.startsWith('/') };
}
