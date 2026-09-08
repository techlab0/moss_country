'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { compressImageForUpload } from '@/lib/imageCompress';

// Sanityの画像はアセット参照(_ref)で保存する。既定のImage拡張は src/alt しか保持せず
// 参照が失われるため、data-asset-ref を属性として往復させる。
const AssetImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetRef: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-asset-ref'),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.assetRef ? { 'data-asset-ref': String(attributes.assetRef) } : {},
      },
    };
  },
});

// ブログ本文のエディタ。ビジュアル表示とコード（HTML）表示を切り替えて編集する。
//
// 値のやり取りはHTML文字列で行い、Sanityの保存形式（Portable Text）への変換は
// 呼び出し側が src/lib/portableTextHtml.ts で行う。ここは表示と入力だけを担当する。
//
// コード表示で書いた内容も、必ず一度エディタに読み込ませてからHTMLを取り出す。
// そうすることで、対応していないタグが保存データに混ざらないようにしている。

interface Props {
  value: string;
  onChange: (html: string) => void;
}

type Mode = 'visual' | 'code';

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active ?? false}
      className={`px-2.5 py-1.5 text-sm rounded border transition-colors disabled:opacity-40 ${
        active
          ? 'bg-moss-green text-white border-moss-green'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  onInsertImage,
  onSetLink,
  uploading,
}: {
  editor: Editor;
  onInsertImage: () => void;
  onSetLink: () => void;
  uploading: boolean;
}) {
  // 選択範囲が変わるたびにボタンの押下状態を更新する必要があるため、再描画のきっかけを持つ
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50">
      <ToolbarButton
        title="太字 (Ctrl+B)"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        title="斜体 (Ctrl+I)"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton title="リンク (Ctrl+K)" active={editor.isActive('link')} onClick={onSetLink}>
        🔗
      </ToolbarButton>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <ToolbarButton
        title="大見出し"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="小見出し"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <ToolbarButton
        title="箇条書き"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        ・リスト
      </ToolbarButton>
      <ToolbarButton
        title="番号付きリスト"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. リスト
      </ToolbarButton>
      <ToolbarButton
        title="引用"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        引用
      </ToolbarButton>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <ToolbarButton title="本文に画像を挿入" onClick={onInsertImage} disabled={uploading}>
        {uploading ? 'アップロード中...' : '🖼 画像'}
      </ToolbarButton>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <ToolbarButton
        title="元に戻す (Ctrl+Z)"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶ 戻す
      </ToolbarButton>
      <ToolbarButton
        title="やり直し (Ctrl+Y)"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷ やり直し
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('visual');
  const [codeValue, setCodeValue] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // onChangeで自分が出したHTMLがvalueとして返ってくるため、その分を再設定しないよう覚えておく
  const lastEmitted = useRef(value);
  // handleKeyDownはエディタ生成時に固定されるため、最新のsetLinkをrefごしに呼ぶ
  const linkHandlerRef = useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      // Sanityスキーマ(blogPost.content)が許可していない書式は、そもそも入力できないようにする。
      // 使えてしまうと保存時に黙って消え、書いた本人が気づけないため。
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: false },
      }),
      AssetImage.configure({ inline: false }),
    ],
    content: value,
    // サーバー描画とクライアント描画の食い違いを避ける（管理画面なのでSSR不要）
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose-admin min-h-[320px] px-4 py-3 focus:outline-none',
      },
      // 太字・斜体・元に戻すはTipTapが標準で割り当てるが、リンクは持っていないため自前で拾う
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          linkHandlerRef.current();
          return true;
        }
        return false;
      },
    },
  });

  // 記事の読み込み完了など、外から本文が差し替わったときだけエディタへ反映する
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  // リンクの設定・解除。ツールバーのボタンと Ctrl+K の両方から呼ぶ。
  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const input = window.prompt('リンク先のURLを入力してください（空欄でリンクを解除）', previous ?? 'https://');
    if (input === null) return;
    const url = input.trim();
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    // javascript: のようなスキームは公開ページにそのまま出るため受け付けない
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) {
      window.alert('URLは http:// または https:// で始めてください');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setUploadError('');
      try {
        const uploadFile = await compressImageForUpload(file);
        const body = new FormData();
        body.append('file', uploadFile);
        const response = await fetch('/api/admin/images/upload', { method: 'POST', body });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '画像のアップロードに失敗しました');
        }
        const data = await response.json();
        const assetRef: string | undefined = data.image?.asset?._ref ?? data.asset?._id;
        const src: string | undefined = data.thumbnailUrl;
        if (!assetRef) {
          throw new Error('アップロードした画像の参照を取得できませんでした');
        }
        // data-asset-ref を保持しないと保存時にSanityの画像として復元できない
        editor
          .chain()
          .focus()
          .insertContent(
            `<img src="${src ?? ''}" alt="" data-asset-ref="${assetRef}">`
          )
          .run();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  useEffect(() => {
    linkHandlerRef.current = setLink;
  }, [setLink]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'code') {
      setCodeValue(editor?.getHTML() ?? value);
      setMode('code');
      return;
    }
    // コード表示の内容は一度エディタに通して正規化する（未対応タグをここで落とす）
    if (editor) {
      editor.commands.setContent(codeValue || '', { emitUpdate: false });
      const normalized = editor.getHTML();
      lastEmitted.current = normalized;
      onChange(normalized);
    }
    setMode('visual');
  };

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-md min-h-[380px] flex items-center justify-center text-sm text-gray-500">
        エディタを読み込んでいます...
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          onClick={() => switchMode('visual')}
          className={`px-4 py-2 text-sm font-medium ${
            mode === 'visual' ? 'bg-white text-gray-900 border-b-2 border-moss-green' : 'bg-gray-100 text-gray-600'
          }`}
        >
          ビジュアル
        </button>
        <button
          type="button"
          onClick={() => switchMode('code')}
          className={`px-4 py-2 text-sm font-medium ${
            mode === 'code' ? 'bg-white text-gray-900 border-b-2 border-moss-green' : 'bg-gray-100 text-gray-600'
          }`}
        >
          コード
        </button>
      </div>

      {mode === 'visual' ? (
        <>
          <Toolbar
            editor={editor}
            uploading={uploading}
            onSetLink={setLink}
            onInsertImage={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // 同じ画像を続けて選べるように値を空へ戻す
              e.target.value = '';
              if (file) insertImage(file);
            }}
          />
          <EditorContent editor={editor} />
        </>
      ) : (
        <textarea
          value={codeValue}
          onChange={(e) => setCodeValue(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[380px] px-4 py-3 font-mono text-sm focus:outline-none"
        />
      )}

      {uploadError && <p className="px-4 py-2 text-sm text-red-600 border-t border-gray-200">{uploadError}</p>}
      <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
        Ctrl+B 太字 / Ctrl+I 斜体 / Ctrl+K リンク / Ctrl+Z 元に戻す。
        「コード」タブではHTMLを直接編集できます（対応していないタグは戻したときに取り除かれます）。
      </p>
    </div>
  );
}
