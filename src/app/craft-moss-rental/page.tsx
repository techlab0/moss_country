'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { usePageContent } from '@/hooks/usePageContent';

const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);
const rows = (value: string) => lines(value).map(line => line.split('｜').map(cell => cell.trim()));
const planImageKeys = ['planImage1', 'planImage2', 'planImage3'];

export default function CraftMossRentalPage() {
  const { t, img, imgAlt } = usePageContent('craftMossRental');
  const features = rows(t('features'));
  const plans = rows(t('plans'));
  const scenes = rows(t('scenes'));
  const flow = lines(t('flow'));
  const notes = lines(t('notes'));

  return (
    <main className="min-h-screen bg-[#f4f2e9] text-[#26362d]">
      <nav aria-label="レンタルサービスの選択" className="border-b border-[#c4cec6] bg-white py-5 shadow-sm">
        <Container>
          <p className="mb-3 text-center text-sm font-bold tracking-wide text-[#557962]">レンタルサービスを選択</p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
            <span aria-current="page" className="rounded-xl border-2 border-[#173b27] bg-[#173b27] px-3 py-4 text-center font-bold text-white sm:text-lg">
              クラフトモスレンタル
            </span>
            <Link href="/rental-terrarium" className="rounded-xl border-2 border-[#557962] bg-[#edf3ed] px-3 py-4 text-center font-bold text-[#173b27] transition hover:bg-[#dfe9df] sm:text-lg">
              テラリウムレンタル
            </Link>
          </div>
        </Container>
      </nav>
      <section className="relative flex min-h-[72vh] items-end overflow-hidden">
        <Image src={img('heroImage')} alt={imgAlt('heroImage', 'クラフトモスを使った空間装飾')} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />
        <Container className="relative z-10 pb-16 pt-36 md:pb-24">
          <p className="text-sm font-semibold tracking-[0.28em] text-emerald-100">{t('heroEyebrow')}</p>
          <h1 className="mt-5 max-w-4xl whitespace-pre-line text-4xl font-bold leading-tight text-white sm:text-5xl md:text-7xl">{t('heroTitle')}</h1>
          <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-8 text-white/90 md:text-xl">{t('heroLead')}</p>
          <Link href="/contact" className="mt-9 inline-block rounded-full bg-white px-7 py-3.5 font-bold text-[#173b27] transition hover:bg-emerald-50">{t('heroButton')}</Link>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container><div className="grid items-center gap-10 lg:grid-cols-2"><div><h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('aboutTitle')}</h2><p className="mt-6 whitespace-pre-line leading-8">{t('aboutLead')}</p></div><div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]"><Image src={img('aboutImage')} alt={imgAlt('aboutImage', 'クラフトモス作品')} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" /></div></div></Container>
      </section>

      <section className="bg-[#173b27] py-20 text-white md:py-28"><Container><h2 className="text-3xl font-bold md:text-5xl">{t('featuresTitle')}</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(([title, description], index) => <div key={`${title}-${index}`} className="rounded-2xl border border-white/15 bg-white/5 p-7"><h3 className="text-xl font-bold">{title}</h3><p className="mt-4 leading-7 text-white/75">{description}</p></div>)}</div></Container></section>

      <section className="py-20 md:py-28"><Container><h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('plansTitle')}</h2><p className="mt-5 max-w-3xl whitespace-pre-line leading-8">{t('plansLead')}</p><div className="mt-10 grid gap-6 md:grid-cols-3">{plans.map(([name, example, price], index) => { const imageKey = planImageKeys[index]; const imageSrc = imageKey ? img(imageKey) : ''; return <article key={`${name}-${index}`} className="overflow-hidden rounded-2xl border border-[#c4cec6] bg-white shadow-sm">{imageSrc ? <div className="relative aspect-[4/3]"><Image src={imageSrc} alt={imgAlt(imageKey, `${name}のクラフトモス作品`)} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /></div> : <div className="grid aspect-[4/3] place-items-center bg-[#e7ece7] text-sm text-[#718078]">画像未設定</div>}<div className="p-6"><h3 className="text-xl font-bold text-[#173b27]">{name}</h3><p className="mt-3 text-sm leading-6 text-[#5b685f]">{example}</p><p className="mt-5 font-bold text-[#173b27]">{price}</p></div></article>; })}</div></Container></section>

      <section className="bg-white py-20 md:py-28"><Container><h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('scenesTitle')}</h2><div className="mt-10 grid gap-4 sm:grid-cols-2">{scenes.map(([place, use], index) => <div key={`${place}-${index}`} className="border border-[#c4cec6] p-7"><h3 className="font-bold text-[#173b27]">{place}</h3><p className="mt-3 leading-7 text-[#5b685f]">{use}</p></div>)}</div></Container></section>

      <section className="py-20 md:py-28"><Container><h2 className="text-3xl font-bold text-[#173b27] md:text-5xl">{t('flowTitle')}</h2><div className="mt-10 grid gap-3">{flow.map((step, index) => <div key={`${step}-${index}`} className="flex items-center gap-5 border border-[#bcc8bf] bg-white p-5 md:p-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173b27] text-sm font-bold text-white">{String(index + 1).padStart(2, '0')}</span><p className="font-bold text-[#173b27]">{step}</p></div>)}</div></Container></section>

      <section className="bg-[#e5ebe4] py-12"><Container><details className="mx-auto max-w-4xl rounded-xl border border-[#c3cdc5] bg-white p-5"><summary className="cursor-pointer font-bold text-[#173b27]">{t('notesTitle')}</summary><div className="mt-5 space-y-4 text-sm leading-7 text-[#536158]">{notes.map((note, index) => <p key={`${note}-${index}`}>{note}</p>)}</div></details></Container></section>

      <section className="bg-[#173b27] py-20 text-white"><Container><div className="mx-auto max-w-3xl text-center"><h2 className="whitespace-pre-line text-3xl font-bold md:text-5xl">{t('ctaTitle')}</h2><p className="mt-6 whitespace-pre-line leading-8 text-white/75">{t('ctaLead')}</p><Link href="/contact" className="mt-9 inline-block rounded-full bg-white px-8 py-4 font-bold text-[#173b27] transition hover:bg-emerald-50">{t('ctaButton')}</Link></div></Container></section>
    </main>
  );
}
