// 本文（Portable Text）とエディタが扱うHTMLの相互変換。
//
// 保存形式はPortable Textのままなので、ここが壊れると記事の書式が消える。
// 往復して内容が保たれること、想定外の入力で本文を失わないことを重点的に確認する。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/portableTextHtml.ts')).href;
const { blocksToHtml, htmlToBlocks, isEmptyPortableText } = await import(moduleUrl);

/** テスト用に、キーを除いた比較しやすい形へ落とす */
const simplify = (blocks) =>
  blocks.map((block) => {
    if (block._type === 'image') {
      return { type: 'image', ref: block.asset?._ref, alt: block.alt };
    }
    const links = new Map((block.markDefs || []).map((def) => [def._key, def.href]));
    return {
      style: block.style,
      listItem: block.listItem,
      spans: (block.children || []).map((span) => ({
        text: span.text,
        marks: (span.marks || []).map((mark) => links.get(mark) ? `link:${links.get(mark)}` : mark),
      })),
    };
  });

test('段落と見出しをHTMLへ変換する', () => {
  const blocks = [
    { _type: 'block', style: 'h2', children: [{ _type: 'span', text: '大見出し', marks: [] }] },
    { _type: 'block', style: 'h3', children: [{ _type: 'span', text: '小見出し', marks: [] }] },
    { _type: 'block', style: 'normal', children: [{ _type: 'span', text: '本文です', marks: [] }] },
  ];
  assert.equal(blocksToHtml(blocks), '<h2>大見出し</h2><h3>小見出し</h3><p>本文です</p>');
});

test('連続するリスト項目をひとつのul/olにまとめる', () => {
  // Portable Textは項目ごとに独立ブロックなので、HTML側で束ねないと1項目ずつのリストになる
  const blocks = [
    { _type: 'block', listItem: 'bullet', children: [{ _type: 'span', text: 'A', marks: [] }] },
    { _type: 'block', listItem: 'bullet', children: [{ _type: 'span', text: 'B', marks: [] }] },
    { _type: 'block', style: 'normal', children: [{ _type: 'span', text: '間', marks: [] }] },
    { _type: 'block', listItem: 'number', children: [{ _type: 'span', text: 'C', marks: [] }] },
  ];
  assert.equal(
    blocksToHtml(blocks),
    '<ul><li>A</li><li>B</li></ul><p>間</p><ol><li>C</li></ol>'
  );
});

test('太字・斜体・リンクをHTMLへ変換する', () => {
  const blocks = [
    {
      _type: 'block',
      style: 'normal',
      markDefs: [{ _type: 'link', _key: 'l1', href: 'https://example.com' }],
      children: [
        { _type: 'span', text: '太字', marks: ['strong'] },
        { _type: 'span', text: 'と', marks: [] },
        { _type: 'span', text: 'リンク', marks: ['l1'] },
      ],
    },
  ];
  assert.equal(
    blocksToHtml(blocks),
    '<p><strong>太字</strong>と<a href="https://example.com">リンク</a></p>'
  );
});

test('HTMLから書式付きで復元できる', () => {
  const blocks = htmlToBlocks(
    '<h2>見出し</h2><p><strong>太字</strong>と<em>斜体</em>と<a href="https://example.com">リンク</a></p>'
  );
  assert.deepEqual(simplify(blocks), [
    { style: 'h2', listItem: undefined, spans: [{ text: '見出し', marks: [] }] },
    {
      style: 'normal',
      listItem: undefined,
      spans: [
        { text: '太字', marks: ['strong'] },
        { text: 'と', marks: [] },
        { text: '斜体', marks: ['em'] },
        { text: 'と', marks: [] },
        { text: 'リンク', marks: ['link:https://example.com'] },
      ],
    },
  ]);
});

test('往復しても内容が変わらない', () => {
  const html =
    '<h2>見出し</h2><p>本文<strong>太字</strong></p><ul><li>項目1</li><li>項目2</li></ul>' +
    '<ol><li>番号1</li></ol><blockquote><p>引用文</p></blockquote>' +
    '<p><a href="https://example.com/a?b=1&amp;c=2">リンク</a></p>';

  const once = htmlToBlocks(html);
  const back = blocksToHtml(once);
  const twice = htmlToBlocks(back);

  assert.equal(back, html, 'HTML→Portable Text→HTML で元に戻ること');
  assert.deepEqual(simplify(twice), simplify(once), '2周しても構造が変わらないこと');
});

test('リンク付きの太字は装飾を両方保つ', () => {
  const blocks = htmlToBlocks('<p><a href="https://example.com"><strong>強調リンク</strong></a></p>');
  assert.deepEqual(simplify(blocks), [
    {
      style: 'normal',
      listItem: undefined,
      spans: [{ text: '強調リンク', marks: ['strong', 'link:https://example.com'] }],
    },
  ]);
});

test('記号を含む文字列をHTMLに壊されずに往復できる', () => {
  const text = '<script>alert("x")</script> & 5 > 3';
  const blocks = [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text, marks: [] }] }];
  const html = blocksToHtml(blocks);
  assert.ok(!html.includes('<script>'), 'タグとして解釈されないようエスケープすること');
  assert.equal(simplify(htmlToBlocks(html))[0].spans[0].text, text);
});

test('本文中の画像はアセット参照を保って往復する', () => {
  const blocks = htmlToBlocks(
    '<p>前</p><img src="https://cdn.sanity.io/x.png" alt="苔の写真" data-asset-ref="image-abc-800x600-png"><p>後</p>'
  );
  assert.deepEqual(simplify(blocks), [
    { style: 'normal', listItem: undefined, spans: [{ text: '前', marks: [] }] },
    { type: 'image', ref: 'image-abc-800x600-png', alt: '苔の写真' },
    { style: 'normal', listItem: undefined, spans: [{ text: '後', marks: [] }] },
  ]);
});

test('アセット参照の無い画像は保存対象から外す', () => {
  // Sanityに保存できない外部画像を混ぜると、保存時にエラーになるため取り込まない
  const blocks = htmlToBlocks('<p>本文</p><img src="https://example.com/a.png" alt="外部">');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]._type, 'block');
});

test('未対応のタグが混ざっても中のテキストは失わない', () => {
  const blocks = htmlToBlocks('<p>前<span style="color:red">色付き</span>後</p>');
  assert.equal(simplify(blocks)[0].spans.map((s) => s.text).join(''), '前色付き後');
});

test('空の入力でも落ちない', () => {
  assert.deepEqual(htmlToBlocks(''), []);
  assert.deepEqual(htmlToBlocks(null), []);
  assert.deepEqual(htmlToBlocks(undefined), []);
  assert.equal(blocksToHtml(null), '');
  assert.equal(blocksToHtml(undefined), '');
  assert.equal(blocksToHtml([]), '');
});

test('空段落だけのHTMLは空の本文として扱う', () => {
  // 読み込みと保存を繰り返すたびに空ブロックが増えないこと
  assert.deepEqual(htmlToBlocks('<p></p><p></p>'), []);
  assert.equal(isEmptyPortableText(htmlToBlocks('<p></p>')), true);
});

test('本文が空かどうかを判定できる', () => {
  assert.equal(isEmptyPortableText(null), true);
  assert.equal(isEmptyPortableText([]), true);
  assert.equal(
    isEmptyPortableText([{ _type: 'block', children: [{ _type: 'span', text: '  ', marks: [] }] }]),
    true
  );
  assert.equal(
    isEmptyPortableText([{ _type: 'block', children: [{ _type: 'span', text: '本文', marks: [] }] }]),
    false
  );
  // 画像だけの記事は空ではない
  assert.equal(isEmptyPortableText([{ _type: 'image', asset: { _ref: 'image-abc' } }]), false);
});

test('既存記事の形（段落のみ）をそのまま読み書きできる', () => {
  // 公開中の3記事はいずれも段落だけで構成されている。移行で壊れないことを確認する。
  const existing = [
    { _type: 'block', _key: 'block-0', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's0', text: '一段落目', marks: [] }] },
    { _type: 'block', _key: 'block-1', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's1', text: '二段落目', marks: [] }] },
  ];
  const html = blocksToHtml(existing);
  assert.equal(html, '<p>一段落目</p><p>二段落目</p>');
  assert.deepEqual(simplify(htmlToBlocks(html)), simplify(existing));
});
