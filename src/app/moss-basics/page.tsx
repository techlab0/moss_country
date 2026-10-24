'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { usePageContent } from '@/hooks/usePageContent';

const characteristicKeys = ['1', '2', '3'] as const;
const groupKeys = ['1', '2', '3'] as const;
const natureRoleKeys = ['1', '2', '3', '4'] as const;
const carePointKeys = ['1', '2', '3', '4'] as const;
const questionKeys = ['1', '2', '3', '4'] as const;

const careLabels: Record<(typeof carePointKeys)[number], string> = {
  1: 'LIGHT',
  2: 'WATER',
  3: 'AIR',
  4: 'TEMPERATURE',
};

export default function MossBasicsPage() {
  const { t, img, imgAlt, imgStyle } = usePageContent('mossBasics');

  return (
    <div className="min-h-screen bg-[#07100c] text-white">
      <section className="relative isolate flex min-h-[82svh] items-end overflow-hidden pt-24">
        <Image
          src={img('heroImage')}
          alt={imgAlt('heroImage', '岩の表面を覆うみずみずしい苔')}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
          style={imgStyle('heroImage')}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07100c] via-[#07100c]/55 to-black/15" />
        <Container className="pb-14 sm:pb-20 lg:pb-24">
          <p className="mb-5 text-xs uppercase tracking-[0.35em] text-emerald-200 sm:text-sm">{t('heroEyebrow')}</p>
          <h1 className="max-w-4xl whitespace-pre-line font-serif text-4xl font-normal leading-tight tracking-wide sm:text-6xl lg:text-7xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-white/80 sm:text-lg">{t('heroLead')}</p>
          <a href="#basics" className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/30 bg-black/20 px-6 py-3 text-sm text-white backdrop-blur-xs transition-colors hover:border-emerald-300 hover:text-emerald-200">
            {t('heroButton')}<span aria-hidden="true">↓</span>
          </a>
        </Container>
      </section>

      <nav className="sticky top-16 z-20 border-y border-white/10 bg-[#07100c]/90 backdrop-blur-xl" aria-label="ページ内メニュー">
        <Container>
          <div className="flex gap-6 overflow-x-auto py-4 text-sm text-white/65 [scrollbar-width:none] sm:justify-center">
            <a href="#basics" className="whitespace-nowrap transition-colors hover:text-emerald-200">苔とは</a>
            <a href="#features" className="whitespace-nowrap transition-colors hover:text-emerald-200">体の特徴</a>
            <a href="#groups" className="whitespace-nowrap transition-colors hover:text-emerald-200">主な仲間</a>
            <a href="#nature" className="whitespace-nowrap transition-colors hover:text-emerald-200">自然での役割</a>
            <a href="#care" className="whitespace-nowrap transition-colors hover:text-emerald-200">育て方の基本</a>
            <a href="#questions" className="whitespace-nowrap transition-colors hover:text-emerald-200">よくある疑問</a>
          </div>
        </Container>
      </nav>

      <main>
        <section id="basics" className="scroll-mt-32 py-20 sm:py-28">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('basicsEyebrow')}</p>
                <h2 className="mt-4 whitespace-pre-line font-serif text-3xl leading-tight sm:text-5xl">{t('basicsTitle')}</h2>
              </div>
              <div className="space-y-6 text-base leading-8 text-white/70">
                <p>{t('basicsBody1')}</p>
                <p>{t('basicsBody2')}</p>
                <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 px-6 py-5 text-sm leading-7 text-emerald-50/75">{t('basicsNote')}</div>
              </div>
            </div>
          </Container>
        </section>

        <section id="features" className="scroll-mt-32 border-y border-white/10 bg-white/[0.025] py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('featuresEyebrow')}</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">{t('featuresTitle')}</h2>
              <p className="mt-6 leading-8 text-white/65">{t('featuresLead')}</p>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {characteristicKeys.map((key, index) => (
                <article key={key} className="rounded-3xl border border-emerald-200/10 bg-black/20 p-7 sm:p-8">
                  <p className="text-sm tracking-[0.25em] text-emerald-300/75">0{index + 1}</p>
                  <h3 className="mt-5 text-xl font-medium leading-relaxed">{t(`feature${key}Title`)}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/65">{t(`feature${key}Desc`)}</p>
                </article>
              ))}
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {characteristicKeys.map((key) => (
                <div key={key} className="rounded-2xl border border-white/10 p-6 text-center">
                  <p className="text-3xl" aria-hidden="true">{t(`cycle${key}Symbol`)}</p>
                  <p className="mt-3 font-medium">{t(`cycle${key}Title`)}</p>
                  <p className="mt-2 text-sm text-white/55">{t(`cycle${key}Desc`)}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section id="groups" className="scroll-mt-32 py-20 sm:py-28">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
              <div className="lg:sticky lg:top-36 lg:self-start">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('groupsEyebrow')}</p>
                <h2 className="mt-4 whitespace-pre-line font-serif text-3xl leading-tight sm:text-5xl">{t('groupsTitle')}</h2>
                <p className="mt-6 max-w-md leading-8 text-white/65">{t('groupsLead')}</p>
                <Link href="/moss-guide" className="mt-8 inline-flex items-center border-b border-emerald-300/50 pb-1 text-emerald-200 transition-colors hover:border-white hover:text-white">
                  {t('groupsLinkLabel')}<span aria-hidden="true" className="ml-2">→</span>
                </Link>
              </div>
              <div className="space-y-5">
                {groupKeys.map((key, index) => (
                  <article key={key} className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/50 to-black/25 p-7 sm:p-9">
                    <div className="flex items-start gap-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 text-sm text-emerald-200">{index + 1}</span>
                      <div>
                        <h3 className="text-xl font-medium sm:text-2xl">{t(`group${key}Name`)}</h3>
                        <p className="mt-4 leading-8 text-white/65">{t(`group${key}Desc`)}</p>
                        <p className="mt-4 border-l border-emerald-300/30 pl-4 text-sm leading-6 text-emerald-100/60">{t(`group${key}Example`)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section id="nature" className="relative isolate scroll-mt-32 overflow-hidden py-20 sm:py-28">
          <Image src={img('natureImage')} alt={imgAlt('natureImage', '苔に覆われた森の地面を思わせる景色')} fill sizes="100vw" className="-z-20 object-cover" style={imgStyle('natureImage')} />
          <div className="absolute inset-0 -z-10 bg-[#07100c]/85 backdrop-blur-[1px]" />
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('natureEyebrow')}</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">{t('natureTitle')}</h2>
              <p className="mt-6 leading-8 text-white/65">{t('natureLead')}</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {natureRoleKeys.map((key) => (
                <article key={key} className="rounded-2xl border border-white/15 bg-black/45 p-7 backdrop-blur-md">
                  <div className="mb-4 h-1 w-10 rounded-full bg-emerald-300" />
                  <h3 className="text-xl font-medium">{t(`nature${key}Title`)}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">{t(`nature${key}Desc`)}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section id="care" className="scroll-mt-32 border-b border-white/10 bg-[#0a1811] py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('careEyebrow')}</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">{t('careTitle')}</h2>
              <p className="mt-6 leading-8 text-white/65">{t('careLead')}</p>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {carePointKeys.map((key) => (
                <article key={key} className="bg-[#09150f] p-7 sm:p-9">
                  <p className="text-xs tracking-[0.28em] text-emerald-300/70">{careLabels[key]}</p>
                  <h3 className="mt-3 text-2xl font-medium">{t(`care${key}Title`)}</h3>
                  <p className="mt-4 leading-8 text-white/65">{t(`care${key}Desc`)}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section id="questions" className="scroll-mt-32 py-20 sm:py-28">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('questionsEyebrow')}</p>
                <h2 className="mt-4 whitespace-pre-line font-serif text-3xl leading-tight sm:text-5xl">{t('questionsTitle')}</h2>
              </div>
              <div className="divide-y divide-white/10 border-y border-white/10">
                {questionKeys.map((key, index) => (
                  <article key={key} className="py-7 sm:grid sm:grid-cols-[3rem_1fr] sm:gap-4">
                    <span className="font-serif text-xl text-emerald-300/60">0{index + 1}</span>
                    <div>
                      <h3 className="mt-2 text-lg font-medium sm:mt-0">{t(`question${key}`)}</h3>
                      <p className="mt-3 text-sm leading-7 text-white/65">{t(`answer${key}`)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section className="pb-20 sm:pb-28">
          <Container>
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-950/80 to-black/60 px-6 py-12 text-center shadow-2xl shadow-black/25 sm:px-12 sm:py-16">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{t('ctaEyebrow')}</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">{t('ctaTitle')}</h2>
              <p className="mx-auto mt-6 max-w-2xl leading-8 text-white/65">{t('ctaLead')}</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/moss-guide" className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-8 py-3.5 font-medium text-stone-950 transition-colors hover:bg-emerald-300">{t('ctaMossGuideLabel')}</Link>
                <Link href="/terrarium-guide" className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-3.5 font-medium text-white transition-colors hover:border-emerald-300 hover:text-emerald-200">{t('ctaTerrariumGuideLabel')}</Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
