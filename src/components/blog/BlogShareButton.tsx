'use client';

import { useState } from 'react';

interface BlogShareButtonProps {
  url: string;
}

export function BlogShareButton({ url }: BlogShareButtonProps) {
  const [message, setMessage] = useState('');
  const encodedUrl = encodeURIComponent(url);
  const socialLinks = [
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}`,
      className: 'border-black bg-black text-white hover:bg-gray-800',
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: 'border-[#1877f2] bg-[#1877f2] text-white hover:bg-[#1268d3]',
    },
    {
      label: 'LINEで送る',
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
      className: 'border-[#06c755] bg-[#06c755] text-white hover:bg-[#05b34c]',
    },
  ];

  const copyUrl = async (url: string, successMessage = '記事URLをコピーしました') => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is unavailable');
      await navigator.clipboard.writeText(url);
      setMessage(successMessage);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();

      if (copied) {
        setMessage(successMessage);
        return;
      }

      window.prompt('記事URLをコピーしてください', url);
      setMessage('');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url });
        setMessage('');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copyUrl(url, '記事URLをコピーしました。Instagramなどへ貼り付けて共有できます');
  };

  const handleShare = async () => {
    const isMobileLayout = window.matchMedia('(max-width: 767px)').matches;

    if (isMobileLayout && navigator.share) {
      try {
        await navigator.share({
          // 携帯電話の「コピー」で文章ではなく純粋な記事URLだけが入るよう、
          // title/textは渡さずURLだけを共有する。
          url,
        });
        setMessage('');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copyUrl(url);
  };

  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center justify-center rounded-lg border-2 border-moss-green bg-white/90 px-6 py-3 font-medium text-moss-green shadow-sm transition-colors hover:bg-moss-green hover:text-white focus:outline-none focus:ring-2 focus:ring-moss-green focus:ring-offset-2"
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684 6.632 3.316m-6.632-6 6.632-3.316m0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684Zm0-9.316a3 3 0 1 0 5.368-2.684 3 3 0 0 0-5.368 2.684Z" />
        </svg>
        共有
      </button>
      <div className="flex max-w-xl flex-wrap items-center justify-center gap-2" aria-label="共有先を選択">
        <button
          type="button"
          onClick={handleNativeShare}
          className="rounded-full border border-[#c13584] bg-white px-4 py-2 text-sm font-medium text-[#a62c72] transition-colors hover:bg-[#fff3fa] focus:outline-none focus:ring-2 focus:ring-[#c13584] focus:ring-offset-2"
        >
          Instagramなど
        </button>
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-moss-green focus:ring-offset-2 ${link.className}`}
          >
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={() => copyUrl(url)}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-moss-green focus:ring-offset-2"
        >
          URLをコピー
        </button>
      </div>
      <p className="min-h-5 text-sm text-gray-600" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
