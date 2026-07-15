'use client';

import { useEffect, useRef } from 'react';
import { getImageProps } from 'next/image';
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
  /** 管理画面「ページ編集」で上書きできるフィールドキー（PC用） */
  imageKey: string;
  /** 管理画面「ページ編集」で上書きできるフィールドキー（スマホ用） */
  mobileImageKey: string;
  src: string;
  /** モバイル(<768px)用の縦型(9:16)画像。coverクロップで容器が切れないよう専用生成されたもの */
  mobileSrc: string;
  /** background-position 相当（object-position） */
  position: string;
  /** 黒オーバーレイの不透明度（0.55〜0.70） */
  overlay: number;
}

const SCENES: readonly SceneDefinition[] = [
  {
    id: 'about',
    imageKey: 'sceneAboutImage',
    mobileImageKey: 'sceneAboutImageMobile',
    src: '/images/terrarium-generated/terrarium-artwork-woodland-arch-v1.png',
    mobileSrc: '/images/terrarium-generated/terrarium-mobile-artwork-root-cave-v1.png',
    position: '50% 42%',
    overlay: 0.6,
  },
  {
    id: 'news',
    imageKey: 'sceneNewsImage',
    mobileImageKey: 'sceneNewsImageMobile',
    src: '/images/terrarium-generated/terrarium-artwork-moonlit-wetland-v1.png',
    mobileSrc: '/images/terrarium-generated/terrarium-mobile-artwork-misty-spires-v1.png',
    position: '50% 45%',
    overlay: 0.66,
  },
  {
    id: 'products',
    imageKey: 'sceneProductsImage',
    mobileImageKey: 'sceneProductsImageMobile',
    src: '/images/terrarium-generated/terrarium-hero-key-030-v1.png',
    mobileSrc: '/images/terrarium-generated/terrarium-mobile-artwork-circular-spring-v1.png',
    position: '50% 50%',
    overlay: 0.7,
  },
  {
    id: 'workshop',
    imageKey: 'sceneWorkshopImage',
    mobileImageKey: 'sceneWorkshopImageMobile',
    src: '/images/terrarium-generated/terrarium-hero-angle-right-close-v1.png',
    mobileSrc: '/images/terrarium-generated/terrarium-mobile-artwork-copper-fern-v1.png',
    position: '50% 40%',
    overlay: 0.62,
  },
  {
    id: 'cta',
    imageKey: 'sceneCtaImage',
    mobileImageKey: 'sceneCtaImageMobile',
    src: '/images/terrarium-generated/terrarium-artwork-basalt-ravine-v1.png',
    mobileSrc: '/images/terrarium-generated/terrarium-mobile-artwork-waterfall-cliff-v1.png',
    position: '50% 46%',
    overlay: 0.58,
  },
];

// 統一バックドロップ用のSVGノイズ（feTurbulence）。外部リクエストなしのdata URI。
const NOISE_TEXTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

interface SceneBackdropProps {
  img: (key: string) => string;
}

export function SceneBackdrop({ img }: SceneBackdropProps) {
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

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    // 一度表示したシーンのコンテンツは以後アニメーションし直さない（「表示させっぱなし」）
    const revealedContent = new Set<string>();

    const getContent = (id: string | null): HTMLElement | null => {
      if (!id) return null;
      const section = document.querySelector<HTMLElement>(`[data-scene-id="${id}"]`);
      return section?.querySelector<HTMLElement>('[data-scene-content]') ?? null;
    };

    // ── モバイル: 背景レイヤーの切替のみ担当。下スクロールはフェード、上は即時。
    //    背景は常に現在シーンの画像を表示し、黒のまま取り残されない（GSAPタイムライン不使用）。
    const applySceneMobile = (nextId: string | null, direction: 'up' | 'down') => {
      if (nextId === activeIdRef.current) return;
      activeIdRef.current = nextId;
      const animate = direction === 'down' && !reduceMotion;

      layerRefs.current.forEach((layer, id) => {
        layer.style.transition = animate ? 'opacity 0.55s ease' : 'none';
        layer.style.transform = 'none';
        layer.style.opacity = id === nextId ? '1' : '0';
      });
    };

    // ── モバイルのコンテンツ表示: 下スクロール中は各セクションを非表示にしておき、
    //    セクション上端がビューポートの80%ラインに達した瞬間にフェードで表示する。
    //    一度表示したら以後は出しっぱなし（上スクロールで消えない）。
    const sceneIds = SCENES.map((scene) => scene.id);

    const showContent = (content: HTMLElement, animate: boolean) => {
      if (animate) {
        content.style.transition = 'transform 0.6s ease, opacity 0.6s ease';
      } else {
        content.style.transition = 'none';
      }
      content.style.transform = 'translateY(0)';
      content.style.opacity = '1';
    };

    const revealOnArrival = (direction: 'up' | 'down') => {
      const revealLine = window.innerHeight * 0.8;
      for (const id of sceneIds) {
        if (revealedContent.has(id)) continue;
        const section = document.querySelector<HTMLElement>(`[data-scene-id="${id}"]`);
        const content = getContent(id);
        if (!section || !content) continue;
        const top = section.getBoundingClientRect().top;
        // 非同期マウントされたコンテンツ（News等）は初期化時に存在しないため、
        // 発見した時点でまだ到達前なら遅延して隠す（画面外なのでちらつかない）
        if (!content.dataset.revealPrepared) {
          content.dataset.revealPrepared = '1';
          if (!reduceMotion && top >= revealLine) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(24px)';
          }
        }
        if (top < revealLine) {
          revealedContent.add(id);
          showContent(content, direction === 'down' && !reduceMotion);
        }
      }
    };

    // 初期化（モバイルのみ）: ビューポートより下のセクションを事前に隠す。
    // JSでのみ隠すので、JSが動かない環境では通常表示のまま（コンテンツ喪失なし）。
    const initMobileReveal = () => {
      for (const id of sceneIds) {
        const section = document.querySelector<HTMLElement>(`[data-scene-id="${id}"]`);
        const content = getContent(id);
        if (!section || !content) continue;
        content.dataset.revealPrepared = '1';
        if (!reduceMotion && section.getBoundingClientRect().top >= window.innerHeight) {
          content.style.opacity = '0';
          content.style.transform = 'translateY(24px)';
        } else {
          revealedContent.add(id);
        }
      }
    };

    // ── デスクトップ: 黒 → 白ヘアライン → 画像の順で切り替わる高級感のある遷移
    const applySceneDesktop = (nextId: string | null) => {
      const previousId = activeIdRef.current;
      if (nextId === previousId) return;
      activeIdRef.current = nextId;

      const previousLayer = previousId ? layerRefs.current.get(previousId) ?? null : null;
      const nextLayer = nextId ? layerRefs.current.get(nextId) ?? null : null;
      const nextContent = getContent(nextId);

      timelineRef.current?.kill();

      if (reduceMotion) {
        layerRefs.current.forEach((layer, id) => {
          gsap.set(layer, { opacity: id === nextId ? 1 : 0, scale: 1 });
        });
        if (nextContent) gsap.set(nextContent, { y: 0, opacity: 1 });
        return;
      }

      const tl = gsap.timeline();
      timelineRef.current = tl;

      if (previousLayer) {
        tl.to(previousLayer, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
      }
      if (hairline) {
        tl.fromTo(
          hairline,
          { scaleX: 0, opacity: 0.6, transformOrigin: '0% 50%' },
          { scaleX: 1, duration: 0.5, ease: 'power2.inOut' },
          0.1,
        );
        tl.to(hairline, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0.62);
      }
      if (nextLayer) {
        tl.fromTo(
          nextLayer,
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' },
          0.3,
        );
      }
      if (nextContent) {
        tl.fromTo(
          nextContent,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
          0.3,
        );
      }
    };

    let lastScrollY = window.scrollY;
    let scrollScheduled = false;
    const handleScroll = () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      window.setTimeout(() => {
        scrollScheduled = false;
        const y = window.scrollY;
        const direction: 'up' | 'down' = y >= lastScrollY ? 'down' : 'up';
        lastScrollY = y;
        const nextId = findActiveSceneId();
        if (isMobile) {
          applySceneMobile(nextId, direction);
          revealOnArrival(direction);
        } else {
          applySceneDesktop(nextId);
        }
      }, 80);
    };

    // 初期表示（下方向として扱う）
    const initialId = findActiveSceneId();
    if (isMobile) {
      initMobileReveal();
      applySceneMobile(initialId, 'down');
    } else {
      applySceneDesktop(initialId);
    }

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
          {(() => {
            // 画面幅による画像の出し分け（アートディレクション）は、JSの状態ではなく
            // <picture> のブラウザネイティブなメディア選択で行う。JS凍結環境や
            // ハイドレーション初期値の問題に左右されず、該当する側しかダウンロードされない。
            const common = { alt: '', fill: true as const, sizes: '100vw', quality: 80 };
            const desktopSrc = img(scene.imageKey) || scene.src;
            const mobileSrc = img(scene.mobileImageKey) || scene.mobileSrc;
            const { props: mobileProps } = getImageProps({ ...common, src: mobileSrc });
            const { props: desktopProps } = getImageProps({ ...common, src: desktopSrc });
            const { srcSet: desktopSrcSet, ...imgProps } = desktopProps;
            return (
              <picture>
                <source media="(max-width: 767px)" srcSet={mobileProps.srcSet} />
                <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
                <img
                  {...imgProps}
                  alt=""
                  // lazyだとモバイルで表示されないことがあるため確実に先読みする
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover"
                  style={{ ...imgProps.style, objectPosition: scene.position }}
                />
              </picture>
            );
          })()}
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
