import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { featuredMediaCoverage } from '@/content/mediaCoverage';

export function MediaHighlightsSection() {
  return (
    <section
      data-home-screen="regular"
      className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(16,185,129,0.11),transparent_38%),#070807] py-12 sm:py-16 md:py-20"
    >
      <Container>
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-emerald-300 sm:text-sm">
            Media
          </p>
          <h2 className="text-3xl font-light text-white sm:text-4xl md:text-5xl">
            メディア掲載情報
          </h2>
          <div className="mx-auto mt-6 h-px w-28 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {featuredMediaCoverage.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-stone-950/70 shadow-2xl shadow-black/20 backdrop-blur-sm"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-emerald-950 to-stone-950">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.imageAlt ?? ''}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="font-serif text-5xl tracking-[0.2em] text-emerald-100/20">MOSS</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs text-white backdrop-blur-sm">
                  {item.category}
                </span>
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-center gap-3 text-xs text-emerald-300">
                  <time dateTime={item.date}>{item.displayDate}</time>
                  <span className="h-px flex-1 bg-emerald-400/20" />
                </div>
                <p className="mb-2 text-sm text-white/60">{item.outlet}</p>
                <h3 className="line-clamp-2 text-lg font-medium leading-relaxed text-white">{item.title}</h3>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center sm:mt-10">
          <Link
            href="/media"
            className="inline-flex items-center rounded-full border border-emerald-400 px-8 py-3 font-medium text-emerald-300 transition-colors duration-300 hover:bg-emerald-400 hover:text-stone-950"
          >
            メディア情報を一覧で見る
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  );
}
