import Link from 'next/link';

// ページ別メンテナンス（準備中）の表示。
// 管理画面のサイト設定で指定されたページにアクセスすると、ミドルウェアがこのページにrewriteする。
export default function PageUnavailablePage() {
  return (
    <div className="bg-stone-950 min-h-screen pt-20 flex items-center justify-center px-4">
      <div className="max-w-md text-center py-16">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🌱</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">このページは現在準備中です</h1>
        <p className="text-stone-400 mb-8">
          ただいま内容を調整しています。
          <br />
          公開まで今しばらくお待ちください。
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors"
        >
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}
