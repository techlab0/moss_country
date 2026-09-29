import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { mediaCoverage } from '@/content/mediaCoverage';

export const metadata: Metadata = {
  title: 'メディア掲載情報',
  description:
    'Moss Country（モスカントリー）のテレビ出演、Web記事、イベント掲載などのメディア情報をご紹介します。',
  alternates: { canonical: '/media' },
  openGraph: {
    title: 'メディア掲載情報 | MOSS COUNTRY',
    description: 'テレビ出演やWeb掲載など、Moss Countryのこれまでのメディア掲載実績をご紹介します。',
    url: '/media',
    images: ['/images/media/stv-fukunaga-2025.jpg'],
  },
};

const categoryStyles = {
  テレビ: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  Web掲載: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
} as const;

export default function MediaPage() {
  return (
    <div className="min-h-screen bg-[#07100c] text-white">
      <section className="relative isolate flex min-h-[68svh] items-end overflow-hidden pt-24">
        <Image
          src="/images/media/stv-fukunaga-2025.jpg"
          alt="Moss Country店内でのテレビ取材記念写真"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_38%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07100c] via-black/55 to-black/20" />
        <Container className="pb-14 sm:pb-20">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-emerald-200 sm:text-sm">Media & Press</p>
          <h1 className="text-4xl font-light tracking-wide sm:text-5xl md:text-7xl">メディア掲載情報</h1>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/80 sm:text-base">
            テレビ、Web記事、イベントメディアなどでご紹介いただいた記録を、公開情報で確認できたものから掲載しています。
          </p>
        </Container>
      </section>

      <main className="pb-24 pt-8 sm:pt-12">
        <Container>
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute bottom-0 left-[19px] top-0 hidden w-px bg-gradient-to-b from-emerald-300/50 via-emerald-300/15 to-transparent sm:block" />

            <div className="space-y-8 sm:space-y-12">
              {mediaCoverage.map((item) => (
                <article key={item.id} className="relative sm:pl-16">
                  <div className="absolute left-3 top-10 hidden h-4 w-4 rounded-full border-4 border-[#07100c] bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.65)] sm:block" />
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur-sm">
                    <div className={item.image ? 'grid lg:grid-cols-[0.9fr_1.1fr]' : ''}>
                      {item.image && (
                        <div className="relative min-h-64 overflow-hidden bg-black lg:min-h-[360px]">
                          <Image
                            src={item.image}
                            alt={item.imageAlt ?? ''}
                            fill
                            sizes="(min-width: 1024px) 40vw, 100vw"
                            className={item.id.startsWith('stv-') ? 'object-cover object-[50%_28%]' : 'object-cover'}
                          />
                        </div>
                      )}

                      <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                        <div className="mb-5 flex flex-wrap items-center gap-3">
                          <span className={`rounded-full border px-3 py-1 text-xs ${categoryStyles[item.category]}`}>
                            {item.category}
                          </span>
                          <time dateTime={item.date} className="text-sm tracking-[0.12em] text-emerald-200/80">
                            {item.displayDate}
                          </time>
                        </div>
                        <p className="mb-2 text-sm font-medium tracking-wide text-white/55">{item.outlet}</p>
                        <h2 className="text-2xl font-medium leading-relaxed text-white sm:text-3xl">{item.title}</h2>
                        <p className="mt-5 leading-8 text-white/70">{item.description}</p>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-7 inline-flex w-fit items-center border-b border-emerald-300/45 pb-1 text-sm text-emerald-200 transition-colors hover:border-emerald-200 hover:text-white"
                        >
                          {item.sourceLabel}
                          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14M5 7v12h12v-5" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/25 sm:grid sm:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-64 sm:min-h-full">
              <Image
                src="/images/media/tv-coverage-archive.jpg"
                alt="屋外で行われたMoss Countryのテレビ取材画面"
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-7 sm:p-10">
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-amber-200">Archive</p>
              <h2 className="text-2xl font-medium">詳細を確認中の取材記録</h2>
              <p className="mt-5 leading-8 text-white/70">
                屋外からのテレビ取材・中継をはじめ、当時の写真は残っているものの、番組名や放送日を公開情報だけでは確認できなかった記録があります。詳細が確認でき次第、正式な掲載実績として追加します。
              </p>
              <p className="mt-4 text-sm leading-7 text-white/50">
                ラジオ・新聞・雑誌を含め、掲載情報をご存じの方は媒体名と日付をお知らせください。
              </p>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-4xl rounded-3xl border border-emerald-300/15 bg-emerald-950/35 px-6 py-10 text-center sm:px-12">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">For Media</p>
            <h2 className="mt-4 text-2xl font-medium sm:text-3xl">取材・掲載のご相談</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
              苔テラリウム、店舗、ワークショップ、団体・法人向け出張体験に関する取材のご相談を承っています。
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex items-center rounded-full bg-emerald-500 px-8 py-3 font-medium text-stone-950 transition-colors hover:bg-emerald-300"
            >
              お問い合わせ
            </Link>
          </section>
        </Container>
      </main>
    </div>
  );
}
