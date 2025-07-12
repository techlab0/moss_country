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
              <a href="https://www.instagram.com/moss.country/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://x.com/MossCountry" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                <span className="sr-only">X (Twitter)</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
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
                <Link href="/products" className="text-gray-300 hover:text-white transition-colors duration-200">
                  商品紹介
                </Link>
              </li>
              <li>
                <Link href="/workshop" className="text-gray-300 hover:text-white transition-colors duration-200">
                  ワークショップ
                </Link>
              </li>
              <li>
                <Link href="/story" className="text-gray-300 hover:text-white transition-colors duration-200">
                  ストーリー
                </Link>
              </li>
              <li>
                <Link href="/store" className="text-gray-300 hover:text-white transition-colors duration-200">
                  店舗情報
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
                <span className="text-white">10:00 - 18:00</span>
              </li>
              <li className="text-gray-300">
                <span className="block text-sm">定休日</span>
                <span className="text-white">月曜日</span>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">
                  お問い合わせフォーム
                </Link>
              </li>
              <li>
                <a href="https://mosscountry.theshop.jp/" target="_blank" rel="noopener noreferrer" className="text-light-green hover:text-white transition-colors duration-200">
                  ECサイトで購入
                </a>
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
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                プライバシーポリシー
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};