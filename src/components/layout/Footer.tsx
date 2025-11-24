import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center mb-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2">
                <img 
                  src="/images/moss_country_logo.avif" 
                  alt="MOSS COUNTRY" 
                  className="h-12 w-auto"
                />
              </div>
            </Link>
            <p className="text-gray-300 mb-4 max-w-md">
              小さなガラスの中に広がる、無限の自然の世界。
              北海道発、職人が手がける本格テラリウムをお届けします。
            </p>
            <div className="flex space-x-4">
              {/* Instagram */}
              <a href="https://www.instagram.com/moss.country/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              
              {/* X (Twitter) */}
              <a href="https://x.com/MossCountry" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">X (Twitter)</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">YouTube</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>

              {/* Threads */}
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">Threads</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.107-2.14 1.704-3.73 1.704-1.411 0-2.513-.509-3.27-1.51-.732-.967-1.100-2.265-1.100-3.86 0-1.332.299-2.508.89-3.499.592-.991 1.417-1.487 2.451-1.487.736 0 1.369.235 1.881.698.322.291.594.677.805 1.146.33-.93.61-1.766.835-2.487.225-.721.459-1.455.7-2.203.044-.133.06-.225.047-.276-.014-.051-.061-.088-.14-.111a1.67 1.67 0 0 0-.395-.061c-.14 0-.285.014-.434.041-.447.081-.764.253-.95.516-.186.262-.279.606-.279 1.031 0 .425.093.769.279 1.031.186.263.503.435.95.516.149.027.294.041.434.041a1.67 1.67 0 0 0 .395-.061c.079-.023.126-.06.14-.111.013-.051-.003-.143-.047-.276-.241-.748-.475-1.482-.7-2.203-.225-.721-.505-1.557-.835-2.487-.211.469-.483.855-.805 1.146-.512.463-1.145.698-1.881.698-1.034 0-1.859-.496-2.451-1.487-.591-.991-.89-2.167-.89-3.499 0-1.595.368-2.893 1.1-3.86.757-1.001 1.859-1.51 3.27-1.51 1.59 0 2.844.597 3.73 1.704.662.826 1.092 1.92 1.284 3.272.761-.45 1.324-1.04 1.634-1.75.528-1.205.557-3.185-1.09-4.798-1.442-1.414-3.177-2.025-5.8-2.045z"/>
                </svg>
              </a>

              {/* Facebook */}
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">Facebook</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">TikTok</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
              サイトマップ
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/products" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  商品
                </Link>
              </li>
              <li>
                <Link href="/moss-guide" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  苔図鑑
                </Link>
              </li>
              <li>
                <Link href="/workshop" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  ワークショップ
                </Link>
              </li>
              <li>
                <Link href="/story" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  ストーリー
                </Link>
              </li>
              <li>
                <Link href="/store" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  店舗情報
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  ブログ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
              お問い合わせ
            </h3>
            <ul className="space-y-4">
              <li className="text-gray-300">
                <span className="block text-sm">営業時間</span>
                <span className="text-white">11:00 - 20:00</span>
              </li>
              <li className="text-gray-300">
                <span className="block text-sm">営業日</span>
                <span className="text-white">不定休（カレンダーをご確認ください）</span>
              </li>
              <li>
                <Link href="/contact" className="text-emerald-600 hover:text-white transition-colors duration-200">
                  お問い合わせフォーム
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-emerald-600 hover:text-white transition-colors duration-200 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 2.4M17 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  カート
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 MOSS COUNTRY. All rights reserved.
            </p>
            <div className="flex flex-wrap space-x-6 mt-4 md:mt-0 gap-y-2">
              <Link href="/terms" className="text-emerald-600 hover:text-white text-sm transition-colors duration-200">
                利用規約
              </Link>
              <Link href="/privacy" className="text-emerald-600 hover:text-white text-sm transition-colors duration-200">
                プライバシーポリシー
              </Link>
              <Link href="/legal" className="text-emerald-600 hover:text-white text-sm transition-colors duration-200">
                特定商取引法
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};