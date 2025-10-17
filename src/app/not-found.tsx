import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-moss-green/20 to-forest-green/20 flex items-center justify-center px-4 relative">
      {/* 暗いオーバーレイを追加して文字を読みやすくする */}
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="max-w-md w-full text-center relative z-10">
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-white mb-4 drop-shadow-2xl">404</h1>
          <h2 className="text-3xl font-semibold text-white mb-4 drop-shadow-lg">
            ページが見つかりません
          </h2>
          <p className="text-lg text-gray-100 leading-relaxed drop-shadow-md">
            申し訳ございません。<br />
            お探しのページは存在しないか、<br />
            移動された可能性があります。
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-moss-green text-white font-semibold py-3 px-6 rounded-lg hover:bg-moss-green/90 transition-colors duration-200"
          >
            ホームに戻る
          </Link>
          
          <Link
            href="/store"
            className="block w-full bg-white text-moss-green font-semibold py-3 px-6 rounded-lg border-2 border-moss-green hover:bg-moss-green/10 transition-colors duration-200"
          >
            商品を見る
          </Link>
          
          <Link
            href="/contact"
            className="block text-gray-200 hover:text-white transition-colors duration-200 underline drop-shadow-md"
          >
            お困りの場合はお問い合わせください
          </Link>
        </div>
        
        <div className="mt-12 text-center">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-gray-200 drop-shadow-md">
            MOSS COUNTRY - 自然の恵みをお届け
          </p>
        </div>
      </div>
    </div>
  );
}