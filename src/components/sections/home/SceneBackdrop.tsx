'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';

/**
 * 全シーン共通の固定背景ステージ。
 * - 最下層に常に黒（#050505）のベースレイヤーを敷き、遷移中も緑や継ぎ目が見えない
 * - 各シーン（[data-scene-id]を持つセクション）がビューポート中央に来ると、
 *   そのシーンに割り当てたテラリウム画像へ「黒と白」基調の遷移で切り替わる
 *   （旧背景が黒へ沈む 0.3s → 白いヘアラインが横切る 0.5s → 新背景が黒から浮かぶ 0.7s）
 * - コンテンツ側（[data-scene-content]）も同じタイミングで y+24px→0 のフェードイン
 */

interface SceneDefinition {
  id: string;
  src: string;
  /** background-position 相当（object-position） */
  position: string;
  /** 黒オーバーレイの不透明度（0.55〜0.70） */
  overlay: number;
}

const SCENES: readonly SceneDefinition[] = [
  {
    id: 'about',
    src: '/images/terrarium-generated/terrarium-artwork-woodland-arch-v1.png',
    position: '50% 42%',
    overlay: 0.6,
  },
  {
    id: 'news',
    src: '/images/terrarium-generated/terrarium-artwork-moonlit-wetland-v1.png',
    position: '50% 45%',
    overlay: 0.66,
  },
  {
    id: 'products',
    src: '/images/terrarium-generated/terrarium-hero-key-030-v1.png',
    position: '50% 50%',
    overlay: 0.7,
  },
  {
    id: 'workshop',
    src: '/images/terrarium-generated/terrarium-hero-angle-right-close-v1.png',
    position: '50% 40%',
    overlay: 0.62,
  },
  {
    id: 'cta',
    src: '/images/terrarium-generated/terrarium-artwork-basalt-ravine-v1.png',
    position: '50% 46%',
    overlay: 0.58,
  },
];

// 統一バックドロップ用のSVGノイズ（feTurbulence）。外部リクエストなしのdata URI。
const NOISE_TEXTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function SceneBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hairlineRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const hairline = hairlineRef.current;
    if (!rootRef.current) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const findActiveSceneId = (): string | null => {
      const centerY = window.innerHeight / 2;
      const sections = document.querySelectorAll<HTMLElement>('[data-scene-id]');
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
          return section.dataset.sceneId ?? null;
        }
      }
      return null;
    };

    const applyScene = (nextId: string | null) => {
      const previousId = activeIdRef.current;
      if (nextId === previousId) return;
      activeIdRef.current = nextId;

      const previousLayer = previousId ? layerRefs.current.get(previousId) ?? null : null;
      const nextLayer = nextId ? layerRefs.current.get(nextId) ?? null : null;
      const nextSection = nextId
        ? document.querySelector<HTMLElement>(`[data-scene-id="${nextId}"]`)
        : null;
      const nextContent = nextSection?.querySelector<HTMLElement>('[data-scene-content]') ?? null;

      timelineRef.current?.kill();

      if (reduceMotion) {
        // 動きを減らす設定では即座に最終状態へ
        layerRefs.current.forEach((layer, id) => {
          gsap.set(layer, { opacity: id === nextId ? 1 : 0, scale: 1 });
        });
        if (nextContent) gsap.set(nextContent, { y: 0, opacity: 1 });
        return;
      }

      const tl = gsap.timeline();
      timelineRef.current = tl;

      // 1) 旧背景が黒へ沈む
      if (previousLayer) {
        tl.to(previousLayer, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
      }

      // 2) 細い白のヘアラインが画面を横切る
      if (hairline) {
        tl.fromTo(
          hairline,
          { scaleX: 0, opacity: 0.6, transformOrigin: '0% 50%' },
          { scaleX: 1, duration: 0.5, ease: 'power2.inOut' },
          0.1,
        );
        tl.to(hairline, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0.62);
      }

      // 3) 新背景が黒から浮かび上がる
      if (nextLayer) {
        tl.fromTo(
          nextLayer,
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' },
          0.3,
        );
      }

      // 4) コンテンツも同じタイミングでフェードイン
      if (nextContent) {
        tl.fromTo(
          nextContent,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
          0.3,
        );
      }
    };

    let scrollScheduled = false;
    const handleScroll = () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      // rAFではなくmicrotask/timeoutでも動くように軽いスロットル
      window.setTimeout(() => {
        scrollScheduled = false;
        applyScene(findActiveSceneId());
      }, 80);
    };

    applyScene(findActiveSceneId());
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      timelineRef.current?.kill();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-testid="scene-backdrop"
      className="fixed inset-0 z-0 pointer-events-none"
    >
      {/* 常に黒のベースレイヤー（遷移中も緑・継ぎ目が絶対に見えない） */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* シーンごとの背景画像レイヤー */}
      {SCENES.map((scene) => (
        <div
          key={scene.id}
          ref={(el) => {
            if (el) layerRefs.current.set(scene.id, el);
            else layerRefs.current.delete(scene.id);
          }}
          data-scene-layer={scene.id}
          className="absolute inset-0 opacity-0 will-change-[opacity,transform]"
        >
          <Image
            src={scene.src}
            alt=""
            fill
            sizes="100vw"
            quality={80}
            className="object-cover"
            style={{ objectPosition: scene.position }}
          />
          {/* 黒オーバーレイ＋ビネットで沈めて可読性を確保 */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(5, 5, 5, ${scene.overlay})` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 62% at 50% 48%, transparent 40%, rgba(5, 5, 5, 0.72) 100%)',
            }}
          />
        </div>
      ))}

      {/* 微細なノイズテクスチャ（質感の維持） */}
      <div
        className="absolute inset-0"
        style={{ opacity: 0.035, backgroundImage: `url("${NOISE_TEXTURE}")` }}
      />

      {/* 遷移用の白いヘアライン */}
      <div
        ref={hairlineRef}
        className="absolute left-0 right-0 top-1/2 h-px bg-white opacity-0"
      />
    </div>
  );
}
