'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

interface AboutSectionProps {
  t: (key: string) => string;
  ov: (key: string) => string | undefined;
}

/**
 * 文字列を1文字ずつのspanに分解して描画する。
 * breakMode: 'always' は '\n' を常に改行に変換（管理画面からの上書き文言用、改行を保持する）。
 *            'mobile-only' はデフォルト文言用で、'\n'の位置に sm:hidden の<br>を入れる
 *            （従来のレイアウト＝PCでは1行、モバイルのみ改行、を保つため）。
 */
function splitCharsKeepBreaks(text: string, breakMode: 'always' | 'mobile-only') {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => (
    <React.Fragment key={lineIndex}>
      {lineIndex > 0 && (breakMode === 'always' ? <br /> : <br className="sm:hidden" />)}
      {Array.from(line).map((char, charIndex) => (
        <span key={charIndex} data-about-char className="inline-block">
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </React.Fragment>
  ));
}

export function AboutSection({ t, ov }: AboutSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardOuterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardInnerRefs = useRef<Array<HTMLDivElement | null>>([]);

  const overrideTitle = ov('aboutTitle');
  const titleContent = overrideTitle !== undefined
    ? splitCharsKeepBreaks(overrideTitle, 'always')
    : splitCharsKeepBreaks('小さな自然、\n大きな癒し', 'mobile-only');

  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    if (!section || !heading) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const chars = heading.querySelectorAll<HTMLElement>('[data-about-char]');
      const cardOuters = cardOuterRefs.current.filter((el): el is HTMLDivElement => el !== null);
      const cardInners = cardInnerRefs.current.filter((el): el is HTMLDivElement => el !== null);

      if (reduceMotion) {
        gsap.set(chars, { y: 0, opacity: 1 });
        gsap.set(cardInners, { y: 0, opacity: 1 });
        gsap.set(cardOuters, { y: 0 });
        return;
      }

      // 見出し：1文字ずつ浮かび上がる（一度だけ再生）
      gsap.set(chars, { y: 8, opacity: 0 });
      gsap.to(chars, {
        y: 0,
        opacity: 1,
        stagger: 0.03,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: heading,
          start: 'top 82%',
          once: true,
        },
      });

      // カード：下から重さのある出現（一度だけ再生、時差あり）
      cardInners.forEach((inner, index) => {
        gsap.set(inner, { y: 46, opacity: 0 });
        gsap.to(inner, {
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: 'power3.out',
          delay: index * 0.15,
          scrollTrigger: {
            trigger: inner,
            start: 'top 88%',
            once: true,
          },
        });
      });

      // カード：わずかな時差パララックス（スクロールに応じて-8〜8pxの縦ズレ、scrub）
      const centerIndex = (cardOuters.length - 1) / 2;
      cardOuters.forEach((outer, index) => {
        const shift = (index - centerIndex) * 8;
        gsap.fromTo(
          outer,
          { y: -shift },
          {
            y: shift,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-home-screen="regular"
      className="py-10 sm:py-12 md:py-12 lg:py-14 bg-stone-950/90 backdrop-blur-md shadow-2xl"
    >
      <Container>
        <div className="text-center mb-8 sm:mb-10 md:mb-10 lg:mb-12">
          <div className="mb-6 sm:mb-8">
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-400 font-normal">About MOSS COUNTRY</span>
          </div>
          <h2
            ref={headingRef}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-normal text-white leading-tight sm:leading-relaxed px-4"
            style={{ fontFamily: "'Yu Mincho', 'Hiragino Mincho ProN', serif" }}
          >
            {titleContent}
          </h2>
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto mt-6 sm:mt-8 mb-6 sm:mb-8"></div>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-normal text-white max-w-4xl mx-auto leading-relaxed px-4">
            {ov('aboutLead') !== undefined ? (
              <span className="whitespace-pre-line">{ov('aboutLead')}</span>
            ) : (
              <>
                北海道初の苔テラリウム専門店として、
                <br className="hidden sm:block" />
                一つひとつ手作業で作り上げる
                <br className="sm:hidden" />
                本格的なテラリウムをお届けします。
              </>
            )}
          </p>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed mt-6 sm:mt-8 font-normal px-4">
            {ov('aboutSub') !== undefined ? (
              <span className="whitespace-pre-line">{ov('aboutSub')}</span>
            ) : (
              <>
                忙しい日常の中で、ふと目に入る小さな緑の世界が、
                <br className="sm:hidden" />
                あなたの心に安らぎをもたらします。
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 md:gap-10 px-4">
          {[
            {
              theme: 'emerald',
              title: t('card1Title'),
              desc: ov('card1Desc'),
              fallback: <>一つひとつ手作業で<br className="hidden sm:block" />丁寧に作られた<br className="hidden sm:block" />本物のテラリウム</>,
              border: 'border-emerald-400/20 hover:border-emerald-400/40',
              bg: 'bg-emerald-900/30 hover:bg-emerald-900/40',
              accentText: 'group-hover:text-emerald-200',
              accentBar: 'bg-emerald-400',
            },
            {
              theme: 'amber',
              title: t('card2Title'),
              desc: ov('card2Desc'),
              fallback: <>苔テラリウムの<br className="hidden sm:block" />専門店として<br className="hidden sm:block" />地域密着</>,
              border: 'border-amber-600/20 hover:border-amber-600/40',
              bg: 'bg-amber-900/30 hover:bg-amber-900/40',
              accentText: 'group-hover:text-amber-200',
              accentBar: 'bg-amber-500',
            },
            {
              theme: 'teal',
              title: t('card3Title'),
              desc: ov('card3Desc'),
              fallback: <>初心者から上級者まで<br className="hidden sm:block" />楽しめる<br className="hidden sm:block" />ワークショップ</>,
              border: 'border-teal-400/20 hover:border-teal-400/40',
              bg: 'bg-teal-900/30 hover:bg-teal-900/40',
              accentText: 'group-hover:text-teal-200',
              accentBar: 'bg-teal-400',
            },
          ].map((card, index) => (
            <div
              key={card.theme}
              ref={(el) => { cardOuterRefs.current[index] = el; }}
              className="text-center group"
            >
              <div
                ref={(el) => { cardInnerRefs.current[index] = el; }}
                className={`backdrop-blur-md rounded-2xl p-5 sm:p-6 md:p-6 border transition-all duration-300 ${card.bg} ${card.border}`}
              >
                <h3 className={`text-xl sm:text-2xl md:text-3xl font-medium text-white mb-4 transition-colors duration-300 ${card.accentText}`}>{card.title}</h3>
                <div className={`w-12 sm:w-16 h-0.5 mx-auto mb-6 group-hover:w-16 sm:group-hover:w-20 transition-all duration-300 ${card.accentBar}`}></div>
                <p className="text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed font-normal whitespace-pre-line">
                  {card.desc !== undefined ? card.desc : card.fallback}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-10 md:mt-10">
          <a href="/story">
            <Button
              variant="primary"
              size="lg"
              className="px-12 py-4 text-lg font-light bg-emerald-600 hover:bg-emerald-700 border-0 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              ストーリーを読む
            </Button>
          </a>
        </div>
      </Container>
    </section>
  );
}
