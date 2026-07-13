'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './ProductShowcase.module.css';

export interface ProductShowcaseItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  link: string;
}

interface ProductShowcaseProps {
  items: ProductShowcaseItem[];
}

const SEGMENT_POINTS = [0, 1 / 3, 2 / 3, 1];

export function ProductShowcase({ items }: ProductShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const indexRef = useRef<HTMLSpanElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const activeIndexRef = useRef(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const handleSkip = () => {
    const section = sectionRef.current;
    const trigger = scrollTriggerRef.current;
    const targetY = trigger
      ? trigger.end
      : section
        ? section.getBoundingClientRect().bottom + window.scrollY
        : 0;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    gsap.registerPlugin(ScrollTrigger);
    // iOSのアドレスバー伸縮によるrefreshでピンが飛ぶのを防ぐ
    ScrollTrigger.config({ ignoreMobileResize: true });

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionQuery.matches) {
      setIsReducedMotion(true);
      return;
    }

    const media = gsap.matchMedia(section);
    media.add(
      {
        // isDesktopのみだとモバイルでコールバック自体が走らずピンが作られない
        isDesktop: '(min-width: 768px)',
        isMobile: '(max-width: 767px)',
      },
      (mediaContext) => {
        const { isDesktop } = mediaContext.conditions as { isDesktop: boolean; isMobile: boolean };

        const playTransition = (newIndex: number, oldIndex: number | null) => {
          const newImg = imageRefs.current[newIndex];
          const oldImg = oldIndex !== null ? imageRefs.current[oldIndex] : null;
          const newPanel = panelRefs.current[newIndex];
          const oldPanel = oldIndex !== null ? panelRefs.current[oldIndex] : null;

          const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });

          if (oldImg) {
            tl.to(oldImg, { scale: 1.06, filter: 'brightness(0.55)', opacity: 0, duration: 0.7 }, 0);
          }

          if (newImg) {
            gsap.set(newImg, {
              clipPath: 'inset(100% 0% 0% 0%)',
              scale: 1,
              filter: 'brightness(1)',
              opacity: 1,
              zIndex: 2,
            });
            tl.to(newImg, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75 }, 0);
          }

          if (oldPanel) {
            tl.to(oldPanel, { opacity: 0, duration: 0.3 }, 0);
          }

          if (newPanel) {
            gsap.set(newPanel, { opacity: 1, zIndex: 2 });
            const lines = newPanel.querySelectorAll<HTMLElement>('[data-panel-line]');
            gsap.set(lines, { y: 16, opacity: 0 });
            tl.to(lines, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }, 0.15);
          }

          if (indexRef.current) {
            const indexEl = indexRef.current;
            tl.to(indexEl, { opacity: 0, duration: 0.18 }, 0);
            tl.call(() => {
              indexEl.textContent = String(newIndex + 1).padStart(2, '0');
            }, undefined, 0.18);
            tl.to(indexEl, { opacity: 1, duration: 0.28 }, 0.2);
          }
        };

        const scrollTrigger = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: isDesktop ? '+=320%' : '+=280%',
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          snap: {
            snapTo: (value) => SEGMENT_POINTS.reduce(
              (closest, point) => Math.abs(point - value) < Math.abs(closest - value) ? point : closest,
            ),
            duration: { min: 0.2, max: 0.45 },
            delay: 0.05,
            ease: 'power2.out',
          },
          invalidateOnRefresh: true,
          onToggle: (self) => {
            stage.dataset.pinActive = String(self.isActive);
          },
          onUpdate: (self) => {
            const nearestIndex = SEGMENT_POINTS.reduce(
              (closestIndex, point, index) => Math.abs(point - self.progress) < Math.abs(SEGMENT_POINTS[closestIndex] - self.progress)
                ? index
                : closestIndex,
              0,
            );
            if (nearestIndex !== activeIndexRef.current) {
              const previousIndex = activeIndexRef.current;
              activeIndexRef.current = nearestIndex;
              playTransition(nearestIndex, previousIndex);
            }
          },
        });

        scrollTriggerRef.current = scrollTrigger;

        return () => {
          scrollTriggerRef.current = null;
          stage.dataset.pinActive = 'false';
          scrollTrigger.kill();
        };
      },
    );

    return () => {
      media.revert();
    };
  }, []);

  if (isReducedMotion) {
    return (
      <section ref={sectionRef} className={styles.section} aria-label="MOSS COUNTRY の商品ショーケース">
        <div className={styles.staticList}>
          {items.map((item) => (
            <article key={item.id} className={styles.staticCard}>
              <div className={styles.staticImageWrap}>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  quality={82}
                  className={styles.image}
                />
              </div>
              <div className={styles.staticBody}>
                <span className={styles.category}>{item.category}</span>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.description}>{item.description}</p>
                <Link href={item.link} className={styles.link}>詳細を見る →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-roledescription="carousel"
      aria-label="MOSS COUNTRY の商品ショーケース"
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.imageColumn}>
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => { imageRefs.current[index] = el; }}
              className={styles.imageLayer}
              style={{
                clipPath: index === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
                opacity: index === 0 ? 1 : 0,
                zIndex: index === 0 ? 1 : 0,
              }}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(min-width: 768px) 55vw, 100vw"
                quality={85}
                priority={index === 0}
                className={styles.image}
              />
            </div>
          ))}
          <div className={styles.imageVignette} aria-hidden="true" />
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.indexRow} aria-hidden="true">
            <span ref={indexRef} className={styles.index}>01</span>
            <span className={styles.indexTotal}>/ {String(items.length).padStart(2, '0')}</span>
          </div>

          {items.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => { panelRefs.current[index] = el; }}
              className={styles.panel}
              style={{ opacity: index === 0 ? 1 : 0, zIndex: index === 0 ? 1 : 0 }}
              aria-hidden={index === 0 ? undefined : true}
            >
              <span data-panel-line className={styles.category}>{item.category}</span>
              <h3 data-panel-line className={styles.title}>{item.title}</h3>
              <p data-panel-line className={styles.description}>{item.description}</p>
              <Link data-panel-line href={item.link} className={styles.link}>詳細を見る →</Link>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={styles.skipButton}
          aria-label="商品ショーケースをとばして次のセクションへ進む"
          onClick={handleSkip}
        >
          とばす ↓
        </button>
      </div>
    </section>
  );
}
