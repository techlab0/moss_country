'use client';

import { useState } from 'react';

interface BlogShareButtonProps {
  title: string;
}

export function BlogShareButton({ title }: BlogShareButtonProps) {
  const [message, setMessage] = useState('');

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('記事URLをコピーしました');
    } catch {
      window.prompt('記事URLをコピーしてください', url);
      setMessage('');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title}｜MOSS COUNTRY`,
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
      <p className="min-h-5 text-sm text-gray-600" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
