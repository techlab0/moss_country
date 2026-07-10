'use client';

interface TerrariumFallbackProps {
  fontClassName: string;
}

/**
 * prefers-reduced-motion または WebGL 非対応環境向けの静的フォールバック。
 * 3D は一切描画せず、同じ闇の世界観と最終コピーだけを1画面で見せる。
 */
export function TerrariumFallback({ fontClassName }: TerrariumFallbackProps) {
  return (
    <section
      className={`relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0c0f0d] ${fontClassName}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(60,90,70,0.18) 0%, rgba(12,15,13,0.9) 55%, #0c0f0d 100%)',
        }}
      />
      <div className="relative z-10 px-6 text-center">
        <p
          className="text-xl leading-relaxed sm:text-2xl md:text-3xl"
          style={{ color: '#e8ede9', letterSpacing: '0.15em' }}
        >
          小さなガラスの中に、無限の自然。
        </p>
        <p
          className="mt-8 text-xs sm:text-sm"
          style={{ color: '#9fb0a4', letterSpacing: '0.35em' }}
        >
          MOSS COUNTRY
        </p>
      </div>
    </section>
  );
}
