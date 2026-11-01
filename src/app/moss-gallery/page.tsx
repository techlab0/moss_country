import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { MossGallery } from '@/components/moss-gallery/MossGallery';
import { mossGalleryPhotos } from '@/content/mossGallery';

export default function MossGalleryPage() {
  const coverPhoto = mossGalleryPhotos[0];

  return (
    <div className="min-h-screen bg-[#07100c] text-white">
      <section className="relative isolate flex min-h-[72svh] items-end overflow-hidden pt-24">
        <Image
          src={coverPhoto.src}
          alt={coverPhoto.alt}
          fill
          loading="eager"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07100c] via-[#07100c]/55 to-black/20" />
        <Container className="pb-14 sm:pb-20 lg:pb-24">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-200 sm:text-sm">MOSS LANDSCAPES</p>
          <h1 className="mt-5 font-serif text-4xl font-normal tracking-wide sm:text-6xl lg:text-7xl">苔風景写真集</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
            森の足元、静かな庭、水のそば。光と湿り気の中に広がる苔の風景を集めました。
          </p>
        </Container>
      </section>

      <main className="py-16 sm:py-24">
        <Container>
          <div className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-10 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">PHOTO COLLECTION</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">苔がつくる、静かな景色</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              写真は最初の12点だけを読み込みます。「もっと見る」を押すと12点ずつ追加され、写真を選ぶと大きくご覧いただけます。
            </p>
          </div>

          <MossGallery photos={mossGalleryPhotos} />

          <div className="mt-20 border-t border-white/10 pt-10 text-center">
            <p className="text-sm text-white/55">苔の特徴や育ち方も、あわせてご覧ください。</p>
            <Link
              href="/moss-basics"
              className="mt-5 inline-flex items-center border-b border-emerald-300/50 pb-1 text-emerald-200 transition-colors hover:border-white hover:text-white"
            >
              苔を知る <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        </Container>
      </main>
    </div>
  );
}
