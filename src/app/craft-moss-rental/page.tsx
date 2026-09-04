'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { usePageContent } from '@/hooks/usePageContent';

const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);
const rows = (value: string) => lines(value).map(line => line.split('｜').map(cell => cell.trim()));

export default function CraftMossRentalPage() {
  const { t, img, imgAlt, imgStyle } = usePageContent('craftMossRental');
  const prices = rows(t('priceRows'));
  const deliveryFees = rows(t('deliveryRows'));
  const contractTerms = rows(t('contractRows'));
  const exchangeFees = rows(t('exchangeRows'));
  const usageNotes = lines(t('usageNotes'));
  const benefits = rows(t('benefits'));

  return (
    <main className="min-h-screen bg-[#f4f2e9] text-[#26362d]">
      <nav aria-label="レンタルサービスの選択" className="border-b border-[#c4cec6] bg-white py-5 shadow-sm">
        <Container>
          <p className="mb-3 text-center text-sm font-bold tracking-wide text-[#557962]">レンタルサービスを選択</p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
            <Link href="/rental-terrarium" className="rounded-xl border-2 border-[#557962] bg-[#edf3ed] px-3 py-4 text-center font-bold text-[#173b27] transition hover:bg-[#dfe9df] sm:text-lg">
              苔テラリウムレンタル
            </Link>
            <span aria-current="page" className="rounded-xl border-2 border-[#173b27] bg-[#173b27] px-3 py-4 text-center font-bold text-white sm:text-lg">
              クラフトモスレンタル
            </span>
          </div>
        </Container>
      </nav>

      <section className="relative flex min-h-[72vh] items-end overflow-hidden">
        <Image src={img('heroImage')} alt={imgAlt('heroImage', 'クラフトモスを使った空間装飾')} fill priority className="object-cover" style={imgStyle('heroImage')} sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        <Container className="relative z-10 pb-16 pt-36 md:pb-24">
          <p className="text-sm font-semibold tracking-[0.28em] text-emerald-100">{t('heroEyebrow')}</p>
          <h1 className="mt-5 max-w-4xl whitespace-pre-line text-4xl font-bold leading-tight text-white sm:text-5xl md:text-7xl">{t('heroTitle')}</h1>
          <p className="mt-7 max-w-3xl whitespace-pre-line text-base leading-8 text-white/90 md:text-xl">{t('heroLead')}</p>
          <Link href="/contact" className="mt-9 inline-block rounded-full bg-white px-7 py-3.5 font-bold text-[#173b27] transition hover:bg-emerald-50">{t('heroButton')}</Link>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div><h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('aboutTitle')}</h2><p className="mt-6 whitespace-pre-line leading-8">{t('aboutLead')}</p></div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]"><Image src={img('aboutImage')} alt={imgAlt('aboutImage', 'クラフトモス作品')} fill className="object-cover" style={imgStyle('aboutImage')} sizes="(min-width: 1024px) 50vw, 100vw" /></div>
          </div>
          <div className="mt-12 grid grid-cols-3 divide-x divide-[#b9c8bc] rounded-2xl border border-[#c4cec6] bg-[#eaf0ea] py-7 text-center text-lg font-bold text-[#28523a] md:text-2xl">
            <p>水やり 0</p><p>日光 0</p><p>日常のお手入れ 0</p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-20 md:py-28">
        <Container>
          <h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('pricesTitle')}</h2>
          <p className="mt-5 whitespace-pre-line leading-8 text-[#5b685f]">{t('pricesLead')}</p>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-[#c4cec6]">
            <table className="w-full min-w-[720px] border-collapse bg-white text-left">
              <thead className="bg-[#315d45] text-white"><tr><th className="p-4">名称</th><th className="p-4">サイズ目安</th><th className="p-4">月額（税込）</th><th className="p-4">おすすめ設置場所</th></tr></thead>
              <tbody>{prices.map(([name, size, price, place], index) => <tr key={`${name}-${index}`} className="border-t border-[#d4ddd6]"><th className="p-4 font-bold">{name}</th><td className="p-4">{size}</td><td className="p-4 font-bold text-[#315d45]">{price}</td><td className="p-4">{place}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#637067]">{t('pricesNote')}</p>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container>
          <h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('deliveryTitle')}</h2>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-[#c4cec6] bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-[#315d45] text-white"><tr><th className="p-4">エリア</th><th className="p-4">初回配送・設置費（税込）</th><th className="p-4">備考</th></tr></thead>
              <tbody>{deliveryFees.map(([area, fee, note], index) => <tr key={`${area}-${index}`} className="border-t border-[#d4ddd6]"><th className="p-4 font-bold">{area}</th><td className="p-4 font-bold text-[#315d45]">{fee}</td><td className="p-4">{note}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#637067]">{t('deliveryNote')}</p>
        </Container>
      </section>

      <section className="bg-[#173b27] py-20 text-white md:py-28">
        <Container>
          <h2 className="text-3xl font-bold md:text-5xl">{t('contractTitle')}</h2>
          <dl className="mt-10 overflow-hidden rounded-2xl bg-white text-[#26362d]">{contractTerms.map(([label, value], index) => <div key={`${label}-${index}`} className="grid border-t border-[#d4ddd6] first:border-0 md:grid-cols-[16rem_1fr]"><dt className="bg-[#edf2ed] p-5 font-bold">{label}</dt><dd className="p-5">{value}</dd></div>)}</dl>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('rulesTitle')}</h2>
            <p className="mt-4 text-[#5b685f]">{t('rulesLead')}</p>
            <div className="mt-10 space-y-5">
              <article className="rounded-2xl border border-[#c4cec6] bg-white p-7"><h3 className="text-xl font-bold text-[#173b27]">1. {t('maintenanceTitle')}</h3><p className="mt-4 whitespace-pre-line leading-8">{t('maintenanceText')}</p></article>
              <article className="rounded-2xl border border-[#c4cec6] bg-white p-7"><h3 className="text-xl font-bold text-[#173b27]">2. {t('exchangeTitle')}</h3><div className="mt-5 divide-y divide-[#d4ddd6]">{exchangeFees.map(([name, fee], index) => <div key={`${name}-${index}`} className="flex justify-between gap-5 py-3"><span>{name}</span><strong>{fee}</strong></div>)}</div><p className="mt-4 text-sm text-[#637067]">{t('exchangeNote')}</p></article>
              <article className="rounded-2xl border border-[#c4cec6] bg-white p-7"><h3 className="text-xl font-bold text-[#173b27]">3. {t('cancellationTitle')}</h3><p className="mt-4 whitespace-pre-line leading-8">{t('cancellationText')}</p></article>
              <article className="rounded-2xl border border-[#c4cec6] bg-white p-7"><h3 className="text-xl font-bold text-[#173b27]">4. {t('usageTitle')}</h3><ul className="mt-4 space-y-2 leading-7">{usageNotes.map((note, index) => <li key={`${note}-${index}`} className="flex gap-3"><span aria-hidden="true" className="text-[#557962]">●</span><span>{note}</span></li>)}</ul><p className="mt-6 whitespace-pre-line border-t border-[#d4ddd6] pt-5 leading-8">{t('damageText')}</p></article>
              <article className="rounded-2xl border border-[#c4cec6] bg-white p-7"><h3 className="text-xl font-bold text-[#173b27]">5. {t('ownershipTitle')}</h3><p className="mt-4 whitespace-pre-line leading-8">{t('ownershipText')}</p></article>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-20 md:py-28">
        <Container>
          <h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('benefitsTitle')}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{benefits.map(([title, description], index) => <article key={`${title}-${index}`} className="rounded-2xl border border-[#c4cec6] bg-[#f7f8f4] p-7"><h3 className="text-xl font-bold text-[#173b27]">{title}</h3><p className="mt-4 leading-7 text-[#5b685f]">{description}</p></article>)}</div>
        </Container>
      </section>

      <section className="bg-[#173b27] py-20 text-white"><Container><div className="mx-auto max-w-3xl text-center"><h2 className="whitespace-pre-line text-3xl font-bold md:text-5xl">{t('ctaTitle')}</h2><p className="mt-6 whitespace-pre-line leading-8 text-white/75">{t('ctaLead')}</p><Link href="/contact" className="mt-9 inline-block rounded-full bg-white px-8 py-4 font-bold text-[#173b27] transition hover:bg-emerald-50">{t('ctaButton')}</Link></div></Container></section>
    </main>
  );
}
