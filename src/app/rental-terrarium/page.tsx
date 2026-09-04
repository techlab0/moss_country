'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { usePageContent } from '@/hooks/usePageContent';

const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);
const rows = (value: string) => lines(value).map(line => line.split('｜').map(cell => cell.trim()));
const planImageKeys = [
  'planImageMini',
  'planImageSmall',
  'planImageMedium',
  'planImageLarge',
  'planImagePremium',
  'planImageOrderMade',
];

const sectionTitle = 'text-2xl md:text-4xl font-bold text-[#173b27] tracking-tight';

export default function RentalTerrariumPage() {
  const { t, img, imgAlt } = usePageContent('rentalTerrarium');
  const highlights = rows(t('highlights'));
  const longTermPlans = rows(t('longTermPlans'));
  const shortTermPlans = rows(t('shortTermPlans'));
  const deliveryFees = rows(t('deliveryFees'));
  const options = rows(t('options'));
  const locations = rows(t('locations'));
  const steps = lines(t('steps'));
  const terms = lines(t('terms'));

  return (
    <main className="min-h-screen bg-[#f5f3eb] text-[#26362d]">
      <nav aria-label="レンタルサービスの選択" className="border-b border-[#c4cec6] bg-white py-5 shadow-sm">
        <Container>
          <p className="mb-3 text-center text-sm font-bold tracking-wide text-[#557962]">レンタルサービスを選択</p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
            <Link href="/craft-moss-rental" className="rounded-xl border-2 border-[#557962] bg-[#edf3ed] px-3 py-4 text-center font-bold text-[#173b27] transition hover:bg-[#dfe9df] sm:text-lg">
              クラフトモスレンタル
            </Link>
            <span aria-current="page" className="rounded-xl border-2 border-[#173b27] bg-[#173b27] px-3 py-4 text-center font-bold text-white sm:text-lg">
              テラリウムレンタル
            </span>
          </div>
        </Container>
      </nav>
      <section className="relative min-h-[78vh] overflow-hidden flex items-end">
        <Image src={img('heroImage')} alt={imgAlt('heroImage', '深い緑の苔と植物で構成された大型苔テラリウム')} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <Container className="relative z-10 pb-16 pt-36 md:pb-24">
          <p className="mb-5 text-sm font-semibold tracking-[0.28em] text-emerald-100">{t('heroEyebrow')}</p>
          <h1 className="max-w-4xl whitespace-pre-line text-4xl font-bold leading-tight text-white sm:text-5xl md:text-7xl">{t('heroTitle')}</h1>
          <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-8 text-white/90 md:text-xl">{t('heroLead')}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-full bg-white px-7 py-3.5 font-bold text-[#173b27] transition hover:bg-emerald-50">{t('heroPrimaryButton')}</Link>
            <a href="#plans" className="rounded-full border border-white/70 bg-black/20 px-7 py-3.5 font-bold text-white backdrop-blur-sm transition hover:bg-white/10">{t('heroPlansButton')}</a>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map(([label, value]) => <div key={label} className="border border-[#9aad9e] bg-white/70 p-7"><p className="text-sm text-[#607266]">{label}</p><p className="mt-2 text-xl font-bold text-[#173b27]">{value}</p></div>)}
          </div>
        </Container>
      </section>

      <section className="bg-[#163525] py-20 text-white">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div><p className="text-sm font-semibold tracking-[0.24em] text-emerald-200">{t('featureEyebrow')}</p><h2 className="mt-4 whitespace-pre-line text-3xl font-bold leading-snug md:text-5xl">{t('featureTitle')}</h2><p className="mt-6 whitespace-pre-line leading-8 text-white/80">{t('featureLead')}</p></div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]"><Image src={img('featureImage1')} alt={imgAlt('featureImage1', '岩と苔の渓谷を表現した苔テラリウム')} fill className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" /></div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]"><Image src={img('featureImage2')} alt={imgAlt('featureImage2', '流木のアーチと苔の森を表現した苔テラリウム')} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div>
            <div className="flex items-center rounded-[2rem] border border-white/15 bg-white/5 p-8 md:p-12"><div><h3 className="text-2xl font-bold">{t('customTitle')}</h3><p className="mt-4 whitespace-pre-line leading-8 text-white/75">{t('customLead')}</p></div></div>
          </div>
        </Container>
      </section>

      <section id="plans" className="py-20 md:py-28">
        <Container>
          <p className="text-sm font-bold tracking-[0.2em] text-[#557962]">{t('longTermEyebrow')}</p><h2 className={`${sectionTitle} mt-3`}>{t('longTermTitle')}</h2>
          <p className="mt-5 whitespace-pre-line leading-7">{t('longTermLead')}</p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#c4cec6] bg-white"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#e5ebe6] text-[#173b27]"><tr><th className="p-4">写真</th><th className="p-4">プラン</th><th className="p-4">サイズ目安</th><th className="p-4">月額料金（税込）</th></tr></thead><tbody>{longTermPlans.map((row, index) => { const imageKey = planImageKeys[index]; const imageSrc = imageKey ? img(imageKey) : ''; return <tr key={`${row[0]}-${index}`} className="border-t border-[#d6ddd7]"><td className="w-28 p-3">{imageSrc ? <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[#eef2ed]"><Image src={imageSrc} alt={imgAlt(imageKey, `${row[0]}サイズのレンタルテラリウム`)} fill className="object-cover" sizes="80px" /></div> : <div className="grid h-20 w-20 place-items-center rounded-xl bg-[#eef2ed] text-center text-xs text-[#718078]">画像<br />未設定</div>}</td>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="p-4">{cell}</td>)}</tr>; })}</tbody></table></div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-7 shadow-sm"><h3 className="text-xl font-bold text-[#173b27]">{t('includedTitle')}</h3><ul className="mt-5 space-y-3 leading-7">{lines(t('includedServices')).map(item => <li key={item}>・{item}</li>)}</ul></div>
            <div className="rounded-2xl bg-[#dfe9df] p-7"><h3 className="text-xl font-bold text-[#173b27]">{t('optionsTitle')}</h3><ul className="mt-5 space-y-3 leading-7">{options.map(([name, description], index) => <li key={`${name}-${index}`}><strong>{name}：</strong>{description}</li>)}</ul><p className="mt-4 whitespace-pre-line text-sm text-[#526257]">{t('optionsNote')}</p></div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-20 md:py-28">
        <Container>
          <p className="text-sm font-bold tracking-[0.2em] text-[#557962]">{t('shortTermEyebrow')}</p><h2 className={`${sectionTitle} mt-3`}>{t('shortTermTitle')}</h2><p className="mt-5 whitespace-pre-line leading-7">{t('shortTermLead')}</p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#c4cec6]"><table className="w-full min-w-[850px] text-left"><thead className="bg-[#e5ebe6] text-[#173b27]"><tr><th className="p-4">写真</th><th className="p-4">プラン</th><th className="p-4">サイズ</th><th className="p-4">1週間</th><th className="p-4">2週間</th><th className="p-4">1か月</th></tr></thead><tbody>{shortTermPlans.map((row, index) => { const imageKey = planImageKeys[index]; const imageSrc = imageKey ? img(imageKey) : ''; return <tr key={`${row[0]}-${index}`} className="border-t border-[#d6ddd7]"><td className="w-28 p-3">{imageSrc ? <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[#eef2ed]"><Image src={imageSrc} alt={imgAlt(imageKey, `${row[0]}サイズのレンタルテラリウム`)} fill className="object-cover" sizes="80px" /></div> : <div className="grid h-20 w-20 place-items-center rounded-xl bg-[#eef2ed] text-center text-xs text-[#718078]">画像<br />未設定</div>}</td>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="p-4">{cell}</td>)}</tr>; })}</tbody></table></div>
          <p className="mt-4 whitespace-pre-line text-sm text-[#5a665e]">{t('shortTermNote')}</p>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container>
          <h2 className={sectionTitle}>{t('deliveryTitle')}</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#c4cec6] bg-white"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#e5ebe6] text-[#173b27]"><tr><th className="p-4">エリア</th><th className="p-4">長期：初回搬入・設置</th><th className="p-4">短期：搬入・設置・回収</th></tr></thead><tbody>{deliveryFees.map(row => <tr key={row[0]} className="border-t border-[#d6ddd7]">{row.map(cell => <td key={cell} className="p-4">{cell}</td>)}</tr>)}</tbody></table></div>
          <div className="mt-8 grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-[#c4cec6] p-7"><h3 className="font-bold text-[#173b27]">{t('sapporoTitle')}</h3><p className="mt-3 whitespace-pre-line leading-7">{t('sapporoLead')}</p></div><div className="rounded-2xl border border-[#c4cec6] p-7"><h3 className="font-bold text-[#173b27]">{t('outsideSapporoTitle')}</h3><p className="mt-3 whitespace-pre-line leading-7">{t('outsideSapporoLead')}</p></div></div>
        </Container>
      </section>

      <section className="bg-[#e5ebe4] py-20 md:py-28">
        <Container><h2 className={sectionTitle}>{t('locationsTitle')}</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{locations.map(([title, desc], index) => <div key={`${title}-${index}`} className="bg-white p-7"><h3 className="font-bold text-[#173b27]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5b685f]">{desc}</p></div>)}</div></Container>
      </section>

      <section className="py-20 md:py-28"><Container><h2 className={sectionTitle}>{t('stepsTitle')}</h2><div className="mt-10 grid gap-3">{steps.map((step, i) => <div key={`${step}-${i}`} className={`flex items-center gap-5 border p-5 md:p-6 ${i === steps.length - 1 ? 'border-[#557962] bg-[#e3ebe4]' : 'border-[#bcc8bf] bg-white'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173b27] text-sm font-bold text-white">{String(i + 1).padStart(2, '0')}</span><p className="font-bold text-[#173b27]">{step}</p></div>)}</div></Container></section>

      <section className="bg-[#173b27] py-20 text-white"><Container><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold tracking-[0.24em] text-emerald-200">{t('ctaEyebrow')}</p><h2 className="mt-4 whitespace-pre-line text-3xl font-bold md:text-5xl">{t('ctaTitle')}</h2><p className="mt-6 whitespace-pre-line leading-8 text-white/75">{t('ctaLead')}</p><Link href="/contact" className="mt-9 inline-block rounded-full bg-white px-8 py-4 font-bold text-[#173b27] transition hover:bg-emerald-50">{t('ctaButton')}</Link></div></Container></section>

      <section className="bg-[#f5f3eb] py-12"><Container><details className="mx-auto max-w-4xl rounded-xl border border-[#c3cdc5] bg-white p-5"><summary className="cursor-pointer font-bold text-[#173b27]">{t('termsTitle')}</summary><div className="mt-5 space-y-4 text-sm leading-7 text-[#536158]">{terms.map((term, index) => <p key={`${term}-${index}`}>{term}</p>)}</div></details></Container></section>
    </main>
  );
}
