'use client';

import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 relative" style={{
        backgroundImage: 'url(/images/hero/main-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
        <Container className="relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-moss-green mb-6">
              プライバシーポリシー
            </h1>
            <div className="w-24 h-1 bg-moss-green mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              お客様の個人情報保護に関する当店の取り組みをご説明いたします。
            </p>
          </div>
        </Container>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-20 bg-white">
        <Container>
          <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-moss-green mb-4">個人情報の収集について</h2>
            <p className="text-gray-700 mb-4">
              当店では、お客様に最適なサービスを提供するために、以下の個人情報を収集させていただく場合があります。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-12">
              <li>お名前</li>
              <li>メールアドレス</li>
              <li>電話番号</li>
              <li>お問い合わせ内容</li>
              <li>ワークショップへの参加履歴</li>
            </ul>

            <h2 className="text-2xl font-bold text-moss-green mb-4">個人情報の利用目的</h2>
            <p className="text-gray-700 mb-4">
              収集させていただいた個人情報は、以下の目的で利用いたします。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-12">
              <li>お問い合わせへの対応</li>
              <li>ワークショップの予約確認・連絡</li>
              <li>商品・サービスに関する情報提供</li>
              <li>アフターサービスの提供</li>
              <li>新商品・イベント情報のご案内（同意をいただいた場合のみ）</li>
            </ul>

            <h2 className="text-2xl font-bold text-moss-green mb-4">個人情報の管理</h2>
            <p className="text-gray-700 mb-4">
              お客様からお預かりした個人情報は、適切に管理し、以下の対策を講じております。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-12">
              <li>個人情報への不正アクセス、紛失、破損、改ざん、漏洩などを防止するため、適切な安全対策を実施</li>
              <li>個人情報を取り扱う従業員に対する教育・研修の実施</li>
              <li>個人情報の取り扱いに関する規程の整備</li>
              <li>定期的なセキュリティ対策の見直し</li>
            </ul>

            <h2 className="text-2xl font-bold text-moss-green mb-4">個人情報の第三者提供</h2>
            <p className="text-gray-700 mb-4">
              当店は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-12">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            </ul>

            <h2 className="text-2xl font-bold text-moss-green mb-4">お客様の権利について</h2>
            <p className="text-gray-700 mb-4">
              お客様は、当店が保有する個人情報について、以下の権利を有しています。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>個人情報の開示を求める権利</li>
              <li>個人情報の訂正・追加・削除を求める権利</li>
              <li>個人情報の利用停止・消去を求める権利</li>
              <li>個人情報の第三者提供の停止を求める権利</li>
            </ul>
            <p className="text-gray-700 mb-12">
              これらの権利を行使される場合は、下記のお問い合わせ先までご連絡ください。
            </p>

            <h2 className="text-2xl font-bold text-moss-green mb-4">Cookieの使用について</h2>
            <p className="text-gray-700 mb-4">
              当サイトでは、サービスの向上とお客様の利便性を高めるため、Cookieを使用しています。
            </p>
            <p className="text-gray-700 mb-12">
              Cookieの使用を希望されない場合は、ブラウザの設定によりCookieの使用を無効にすることができます。
              ただし、Cookieを無効にした場合、サイトの一部機能が利用できない場合があります。
            </p>

            <h2 className="text-2xl font-bold text-moss-green mb-4">プライバシーポリシーの変更</h2>
            <p className="text-gray-700 mb-4">
              当店は、法令の改正や社会情勢の変化に対応するため、本プライバシーポリシーを適宜見直し、
              予告なく変更することがあります。
            </p>
            <p className="text-gray-700 mb-12">
              変更後のプライバシーポリシーは、当サイトに掲載した時点から効力を生じるものとします。
            </p>

            <h2 className="text-2xl font-bold text-moss-green mb-4">お問い合わせ先</h2>
            <p className="text-gray-700 mb-4">
              個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
            </p>
            <div className="bg-gray-50 p-6 rounded-lg mb-12">
              <h3 className="text-lg font-semibold text-moss-green mb-2">MOSS COUNTRY</h3>
              <p className="text-gray-700">
                〒060-0042<br />
                北海道札幌市中央区大通西5丁目8番地<br />
                電話：011-234-5678<br />
                メール：info@mosscountry.jp<br />
                営業時間：10:00-18:00（定休日：月曜日）
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-600">
                制定日：2024年1月1日<br />
                最終更新日：2024年1月1日
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}