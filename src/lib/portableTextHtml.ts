// Sanityの本文（Portable Text）と、エディタが扱うHTMLの相互変換。
//
// 保存形式は従来どおりPortable Textのままにして、公開ページ（@portabletext/react）は
// 一切変更しない。管理画面の入出力だけをHTMLに寄せることで、リッチテキスト編集を
// 差し込んでも表示側が壊れないようにしている。
//
// 対応する範囲は sanity/schemas/blogPost.ts の content が許可しているものに揃える。
// 段落 / H2 / H3 / 引用 / 箇条書き / 番号リスト / 太字 / 斜体 / リンク / 画像。
// 未知のブロックや装飾は落とさずに素通しできないため、変換できるものだけを扱う。

export interface PortableTextSpan {
  _type: 'span';
  _key?: string;
  text: string;
  marks?: string[];
}

export interface PortableTextMarkDef {
  _type: string;
  _key: string;
  href?: string;
}

export interface PortableTextBlock {
  _type: 'block';
  _key?: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  markDefs?: PortableTextMarkDef[];
  children?: PortableTextSpan[];
}

export interface PortableTextImage {
  _type: 'image';
  _key?: string;
  asset?: { _type?: string; _ref?: string; url?: string };
  alt?: string;
}

export type PortableTextNode = PortableTextBlock | PortableTextImage;

function isImageNode(node: PortableTextNode): node is PortableTextImage {
  return node._type === 'image';
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function unescapeHtml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// 連番キー。Sanityは同一配列内で _key の一意性を要求する。
function keyFactory(prefix: string): () => string {
  let index = 0;
  return () => `${prefix}-${index++}`;
}

function spansToHtml(block: PortableTextBlock): string {
  const markDefs = new Map((block.markDefs || []).map((def) => [def._key, def]));

  return (block.children || [])
    .map((span) => {
      let html = escapeHtml(span.text ?? '');
      // 装飾は内側から順に包む。リンクは最後に外側へ置き、<a><strong>text</strong></a> の形にする。
      for (const mark of span.marks || []) {
        if (mark === 'strong') html = `<strong>${html}</strong>`;
        else if (mark === 'em') html = `<em>${html}</em>`;
      }
      for (const mark of span.marks || []) {
        const def = markDefs.get(mark);
        if (def && def._type === 'link' && def.href) {
          html = `<a href="${escapeHtml(def.href)}">${html}</a>`;
        }
      }
      return html;
    })
    .join('');
}

/**
 * Portable Text をエディタに渡すHTMLへ変換する。
 * 連続するリスト項目は1つの ul / ol にまとめる（Portable Textは項目ごとに独立したブロックのため）。
 */
export function blocksToHtml(
  blocks: PortableTextNode[] | null | undefined,
  imageUrl?: (image: PortableTextImage) => string | null
): string {
  if (!Array.isArray(blocks)) return '';

  const html: string[] = [];
  let openList: 'bullet' | 'number' | null = null;

  const closeList = () => {
    if (openList) {
      html.push(openList === 'bullet' ? '</ul>' : '</ol>');
      openList = null;
    }
  };

  for (const node of blocks) {
    if (isImageNode(node)) {
      closeList();
      const src = imageUrl ? imageUrl(node) : node.asset?.url ?? null;
      if (src) {
        html.push(`<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt || '')}">`);
      }
      continue;
    }

    if (node._type !== 'block') continue;
    const inner = spansToHtml(node);

    if (node.listItem === 'bullet' || node.listItem === 'number') {
      if (openList !== node.listItem) {
        closeList();
        html.push(node.listItem === 'bullet' ? '<ul>' : '<ol>');
        openList = node.listItem;
      }
      html.push(`<li>${inner}</li>`);
      continue;
    }

    closeList();
    switch (node.style) {
      case 'h2':
        html.push(`<h2>${inner}</h2>`);
        break;
      case 'h3':
        html.push(`<h3>${inner}</h3>`);
        break;
      case 'blockquote':
        html.push(`<blockquote><p>${inner}</p></blockquote>`);
        break;
      default:
        // 空段落は編集中の改行として意味があるため、空でも <p></p> を保つ
        html.push(`<p>${inner}</p>`);
    }
  }

  closeList();
  return html.join('');
}

interface InlineToken {
  text: string;
  strong: boolean;
  em: boolean;
  href: string | null;
}

/**
 * インラインHTMLを、装飾の状態を持つテキスト断片へ分解する。
 *
 * エディタが出力するHTMLだけを相手にするため、対応タグを strong/b, em/i, a, br に絞った
 * 小さなパーサにしている。DOMParserを使わないのは、同じ処理をNodeのテストで検証できるようにするため。
 */
function parseInline(html: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const state = { strong: 0, em: 0, href: [] as string[] };
  const tagPattern = /<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;

  let cursor = 0;
  let match: RegExpExecArray | null;

  const pushText = (raw: string) => {
    if (raw === '') return;
    tokens.push({
      text: unescapeHtml(raw),
      strong: state.strong > 0,
      em: state.em > 0,
      href: state.href.length > 0 ? state.href[state.href.length - 1] : null,
    });
  };

  while ((match = tagPattern.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    const attrs = match[3];

    if (tag === 'strong' || tag === 'b') {
      state.strong += closing ? -1 : 1;
      if (state.strong < 0) state.strong = 0;
    } else if (tag === 'em' || tag === 'i') {
      state.em += closing ? -1 : 1;
      if (state.em < 0) state.em = 0;
    } else if (tag === 'a') {
      if (closing) {
        state.href.pop();
      } else {
        const href = /href\s*=\s*"([^"]*)"/i.exec(attrs) || /href\s*=\s*'([^']*)'/i.exec(attrs);
        state.href.push(href ? unescapeHtml(href[1]) : '');
      }
    } else if (tag === 'br' && !closing) {
      pushText('\n');
    }
    // それ以外のタグは装飾として扱えないため、タグだけ捨てて中身のテキストは残す
  }

  pushText(html.slice(cursor));
  return tokens.filter((token) => token.text !== '');
}

function tokensToBlock(
  tokens: InlineToken[],
  base: Partial<PortableTextBlock>,
  nextKey: () => string,
  nextSpanKey: () => string,
  nextMarkKey: () => string
): PortableTextBlock {
  const markDefs: PortableTextMarkDef[] = [];
  const children: PortableTextSpan[] = tokens.map((token) => {
    const marks: string[] = [];
    if (token.strong) marks.push('strong');
    if (token.em) marks.push('em');
    if (token.href) {
      const key = nextMarkKey();
      markDefs.push({ _type: 'link', _key: key, href: token.href });
      marks.push(key);
    }
    return { _type: 'span', _key: nextSpanKey(), text: token.text, marks };
  });

  if (children.length === 0) {
    children.push({ _type: 'span', _key: nextSpanKey(), text: '', marks: [] });
  }

  return {
    _type: 'block',
    _key: nextKey(),
    style: 'normal',
    markDefs,
    children,
    ...base,
  };
}

/**
 * エディタが出力したHTMLを Portable Text へ戻す。
 *
 * 入力は必ずエディタ（TipTap）が正規化したHTMLを渡すこと。
 * 利用者がコード表示に直接書いた内容も、一度エディタに読み込ませてから渡すことで、
 * 想定外のタグがそのまま保存されるのを防いでいる。
 */
export function htmlToBlocks(html: string | null | undefined): PortableTextNode[] {
  if (!html) return [];

  const nextKey = keyFactory('block');
  const nextSpanKey = keyFactory('span');
  const nextMarkKey = keyFactory('link');
  const blocks: PortableTextNode[] = [];

  // ブロック要素を上から順に切り出す。入れ子のリスト項目は内側だけを取り出す。
  const blockPattern = /<(h2|h3|blockquote|ul|ol|p)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(html)) !== null) {
    if (match[3] !== undefined) {
      const attrs = match[3];
      const src = /src\s*=\s*"([^"]*)"/i.exec(attrs);
      const alt = /alt\s*=\s*"([^"]*)"/i.exec(attrs);
      const ref = /data-asset-ref\s*=\s*"([^"]*)"/i.exec(attrs);
      if (ref) {
        blocks.push({
          _type: 'image',
          _key: nextKey(),
          asset: { _type: 'reference', _ref: unescapeHtml(ref[1]) },
          alt: alt ? unescapeHtml(alt[1]) : '',
        });
      } else if (src) {
        // アセット参照が無い画像はSanityに保存できないため、リンクとして残さず捨てる
        continue;
      }
      continue;
    }

    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === 'ul' || tag === 'ol') {
      const listItem = tag === 'ul' ? 'bullet' : 'number';
      const itemPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let item: RegExpExecArray | null;
      while ((item = itemPattern.exec(inner)) !== null) {
        blocks.push(
          tokensToBlock(parseInline(item[1]), { listItem, level: 1 }, nextKey, nextSpanKey, nextMarkKey)
        );
      }
      continue;
    }

    if (tag === 'blockquote') {
      // TipTapは引用の中身を <p> で包むため、内側の段落をまとめて1ブロックにする
      const text = inner.replace(/<\/?p\b[^>]*>/gi, '');
      blocks.push(
        tokensToBlock(parseInline(text), { style: 'blockquote' }, nextKey, nextSpanKey, nextMarkKey)
      );
      continue;
    }

    const style = tag === 'h2' ? 'h2' : tag === 'h3' ? 'h3' : 'normal';
    const tokens = parseInline(inner);
    // 空段落は保存しない（読み込み直したときに空ブロックが増え続けるのを防ぐ）
    if (tokens.length === 0 && style === 'normal') continue;
    blocks.push(tokensToBlock(tokens, { style }, nextKey, nextSpanKey, nextMarkKey));
  }

  return blocks;
}

/** 本文が実質空かどうか（空白だけの段落は空として扱う）。 */
export function isEmptyPortableText(blocks: PortableTextNode[] | null | undefined): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) return true;
  return blocks.every((node) => {
    if (isImageNode(node)) return false;
    return (node.children || []).every((span) => (span.text ?? '').trim() === '');
  });
}
