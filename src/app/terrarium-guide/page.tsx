import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'はじめてのテラリウム｜起源・魅力・楽しみ方',
  description:
    'テラリウムの起源、暮らしにもたらす魅力、人気の理由、おすすめしたい人、置き場所や始め方を苔テラリウム専門店Moss Countryがご案内します。',
  alternates: { canonical: '/terrarium-guide' },
  openGraph: {
    title: '小さな森を、暮らしの中へ。｜MOSS COUNTRY',
    description: 'テラリウムの歴史と魅力、置き場所、初めての選び方をご紹介します。',
    url: '/terrarium-guide',
    images: ['/images/terrarium-generated/terrarium-hero-key-030-v1.png'],
  },
};

const benefits = [
  {
    number: '01',
    title: '視線と気持ちの休憩場所に',
    description:
      'ふと目を向けた先に小さな緑があることは、仕事や家事の合間に気持ちを切り替えるきっかけになります。室内の植物や小規模な緑は、リラックスやストレス軽減を助ける可能性が研究されています。',
  },
  {
    number: '02',
    title: '小さな変化を楽しめる',
    description:
      '新芽、苔の色、ガラスの内側の水滴。ゆっくり移り変わる景色を観察する時間が、忙しい毎日に穏やかなリズムをつくります。',
  },
  {
    number: '03',
    title: '自分だけの景色をつくれる',
    description:
      '石や流木、植物の組み合わせで、森・渓谷・物語の一場面などを自由に表現できます。完成品を選ぶ楽しさと、自分でつくる楽しさの両方があります。',
  },
];

const reasons = [
  ['省スペース', '棚やデスクにも置けるため、庭や広い場所がなくても緑を楽しめます。'],
  ['暮らしになじむ', '透明なガラスと自然素材の組み合わせは、和洋どちらの空間にも静かになじみます。'],
  ['お世話がシンプル', '環境が安定した苔テラリウムは、一般的な鉢植えより水やりの頻度を抑えられます。'],
  ['世界にひとつ', '同じ素材を使っても、苔や石の表情、つくる人の感性によって違う景色になります。'],
];

const recommendations = [
  ['忙しいけれど緑を楽しみたい', '毎日たくさんのお世話をするのは難しくても、身近に植物を置きたい方へ。'],
  ['植物を育てるのが初めて', '置き場所と水分の基本を押さえれば、小さな作品から気軽に始められます。'],
  ['ものづくりが好き', '自然素材を選び、自分の手で景色を組み立てる時間そのものを楽しめます。'],
  ['贈り物を探している', '引っ越し、開店、誕生日など、相手の暮らしに長く寄り添う贈り物になります。'],
  ['親子や大切な人と体験したい', '完成後も成長を一緒に見守れる、思い出の残るものづくりです。'],
  ['北海道でも一年中、緑を感じたい', '雪の季節も室内で小さな自然を眺められます。'],
];

const placements = [
  {
    place: 'デスク・仕事部屋',
    idea: '集中の合間に目を休める、小さな窓のように。',
    tip: 'モニターの熱やエアコンの風が直接当たらない位置へ。',
  },
  {
    place: 'リビングの棚',
    idea: '家族が集まる場所の、静かなアクセントに。',
    tip: '窓辺の明るさは届くけれど、直射日光は当たらない場所がおすすめです。',
  },
  {
    place: '玄関・廊下',
    idea: '帰宅したとき最初に目に入る、やさしい景色として。',
    tip: '暗い場合は植物育成用LEDなどで必要な明るさを補います。',
  },
  {
    place: '店舗・受付',
    idea: 'お客様を迎えるカウンターに、会話が生まれる小さな森を。',
    tip: '人がぶつかりにくい安定した場所を選び、定位置で育てます。',
  },
];

const steps = [
  ['置きたい場所を決める', 'まずは明るさと置ける大きさを確認。直射日光の当たらない安定した場所を選びます。'],
  ['楽しみ方を選ぶ', 'すぐ飾れる完成品か、自分で景色をつくるワークショップかを選びます。'],
  ['好きな世界観を見つける', '丸い器、縦長の器、石や流木。心が惹かれる景色を基準に選んで大丈夫です。'],
  ['小さな変化を見守る', '水滴や苔の色を時々観察しながら、ゆっくり育つ時間を楽しみます。'],
];

const references = [
  {
    label: 'Royal Botanic Gardens, Kew｜The Wardian case: A history of plant transportation',
    href: 'https://www.kew.org/read-and-watch/the-wardian-case-a-history-of-plant-transportation',
  },
  {
    label: 'Smithsonian Gardens｜Wardian case, church with steeple',
    href: 'https://gardens.si.edu/collections/explore/object/hac_1980.011',
  },
  {
    label: 'Iowa State University Extension｜How to Create and Care for a Terrarium',
    href: 'https://yardandgarden.extension.iastate.edu/how-to/how-create-and-care-terrarium',
  },
  {
    label: 'PubMed｜Effects of Indoor Plants on Human Functions: A Systematic Review with Meta-Analyses',
    href: 'https://pubmed.ncbi.nlm.nih.gov/35742700/',
  },
  {
    label: 'PubMed｜Can Even a Small Amount of Greenery Be Helpful in Reducing Stress?',
    href: 'https://pubmed.ncbi.nlm.nih.gov/36011414/',
  },
];

export default function TerrariumGuidePage() {
  return (
    <div className="min-h-screen bg-[#07100c] text-white">
      <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden pt-24">
        <Image
          src="/images/terrarium-generated/terrarium-hero-key-030-v1.png"
          alt="ガラス容器の中に広がる苔と植物の小さな森"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07100c] via-black/55 to-black/10" />
        <Container className="pb-14 sm:pb-20 lg:pb-24">
          <p className="mb-5 text-xs uppercase tracking-[0.35em] text-emerald-200 sm:text-sm">Begin with a tiny forest</p>
          <h1 className="max-w-4xl font-serif text-4xl font-normal leading-tight tracking-wide sm:text-6xl lg:text-7xl">
            小さな森を、<br />暮らしの中へ。
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            ガラスの中に、光と水と植物がつくる小さな世界。<br className="hidden sm:block" />
            テラリウムを知ると、いつもの部屋に新しい景色が見えてきます。
          </p>
          <a
            href="#origin"
            className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/30 bg-black/20 px-6 py-3 text-sm text-white backdrop-blur-sm transition-colors hover:border-emerald-300 hover:text-emerald-200"
          >
            テラリウムの物語を読む
            <span aria-hidden="true">↓</span>
          </a>
        </Container>
      </section>

      <nav className="sticky top-16 z-20 border-y border-white/10 bg-[#07100c]/90 backdrop-blur-xl" aria-label="ページ内メニュー">
        <Container>
          <div className="flex gap-6 overflow-x-auto py-4 text-sm text-white/65 [scrollbar-width:none] sm:justify-center">
            <a href="#origin" className="whitespace-nowrap transition-colors hover:text-emerald-200">起源</a>
            <a href="#benefits" className="whitespace-nowrap transition-colors hover:text-emerald-200">暮らしへの効果</a>
            <a href="#popular" className="whitespace-nowrap transition-colors hover:text-emerald-200">人気の理由</a>
            <a href="#recommended" className="whitespace-nowrap transition-colors hover:text-emerald-200">おすすめの人</a>
            <a href="#placement" className="whitespace-nowrap transition-colors hover:text-emerald-200">置き場所</a>
            <a href="#start" className="whitespace-nowrap transition-colors hover:text-emerald-200">始め方</a>
          </div>
        </Container>
      </nav>

      <main>
        <section id="origin" className="scroll-mt-32 py-20 sm:py-28">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Origin</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">偶然生まれた、<br />ガラスの中の自然</h2>
                <div className="mt-8 space-y-6 leading-8 text-white/70">
                  <p>
                    現代のテラリウムの原型は、19世紀のロンドンで生まれた「ウォードの箱（Wardian case）」とされています。
                  </p>
                  <p>
                    1829年、医師で自然愛好家だったナサニエル・バグショー・ウォードは、蛾の繭を入れた密閉気味のガラス容器の中で、シダが育っていることに気づきました。容器の中では水分が蒸発し、ガラスに結露して土へ戻る、小さな水の循環が起きていたのです。
                  </p>
                  <p>
                    この発見は、長い船旅で植物を守る輸送ケースへ発展し、やがて室内で小さな自然を楽しむ現在のテラリウム文化へつながりました。
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-8 text-center">
                  <div><p className="text-2xl text-emerald-200 sm:text-3xl">1829</p><p className="mt-2 text-xs text-white/50">偶然の発見</p></div>
                  <div><p className="text-2xl text-emerald-200 sm:text-3xl">1833</p><p className="mt-2 text-xs text-white/50">輸送実験</p></div>
                  <div><p className="text-2xl text-emerald-200 sm:text-3xl">1842</p><p className="mt-2 text-xs text-white/50">研究を出版</p></div>
                </div>
              </div>

              <figure className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl shadow-black/40">
                <Image
                  src="/images/terrarium-generated/terrarium-artwork-woodland-arch-v1.png"
                  alt="苔と流木がつくる森のアーチを表現したテラリウム"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <figcaption className="absolute bottom-0 left-0 p-6 text-sm leading-6 text-white/70">
                  光、水、土、植物。<br />小さな器の中でつながる自然。
                </figcaption>
              </figure>
            </div>
          </Container>
        </section>

        <section id="benefits" className="scroll-mt-32 border-y border-white/10 bg-white/[0.025] py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">What greenery brings</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">小さな緑がもたらすもの</h2>
              <p className="mt-6 leading-8 text-white/65">
                テラリウムは医療行為や治療の代わりではありません。それでも、身近に緑を置き、眺め、育てる時間は、暮らしに穏やかな余白をつくってくれます。
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {benefits.map((item) => (
                <article key={item.number} className="rounded-3xl border border-emerald-200/10 bg-black/20 p-7 sm:p-8">
                  <p className="text-sm tracking-[0.25em] text-emerald-300/75">{item.number}</p>
                  <h3 className="mt-5 text-xl font-medium leading-relaxed">{item.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/65">{item.description}</p>
                </article>
              ))}
            </div>

            <p className="mt-8 text-center text-xs leading-6 text-white/40">
              ※効果に関する研究は主に室内植物・小規模な緑全般を対象としたもので、感じ方には個人差があります。
            </p>
          </Container>
        </section>

        <section id="popular" className="scroll-mt-32 py-20 sm:py-28">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div className="lg:sticky lg:top-36 lg:self-start">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Why we love it</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">いま、テラリウムが<br />選ばれる理由</h2>
                <p className="mt-6 max-w-md leading-8 text-white/65">
                  植物を飾るだけではなく、自分の感性で自然の景色を選び、育てていけること。それがテラリウムならではの魅力です。
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {reasons.map(([title, description], index) => (
                  <article key={title} className="min-h-56 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/55 to-black/30 p-7">
                    <p className="text-4xl font-light text-emerald-300/25">0{index + 1}</p>
                    <h3 className="mt-5 text-xl font-medium">{title}</h3>
                    <p className="mt-4 text-sm leading-7 text-white/65">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section id="recommended" className="relative isolate scroll-mt-32 overflow-hidden py-20 sm:py-28">
          <Image
            src="/images/terrarium-generated/terrarium-artwork-basalt-ravine-v1.png"
            alt=""
            fill
            sizes="100vw"
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-black/75 backdrop-blur-[1px]" />
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">For you</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">こんな人におすすめです</h2>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map(([title, description]) => (
                <article key={title} className="rounded-2xl border border-white/15 bg-black/45 p-6 backdrop-blur-md">
                  <div className="mb-4 h-1 w-10 rounded-full bg-emerald-300" />
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">{description}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section id="placement" className="scroll-mt-32 py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Place your forest</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">こんなところに置いてみよう</h2>
              <p className="mt-6 leading-8 text-white/65">
                基本は「明るい日陰」。本が読めるくらいの明るさを目安に、直射日光を避けて置きます。
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {placements.map((item, index) => (
                <article key={item.place} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition-colors hover:border-emerald-300/30 sm:p-8">
                  <div className="flex items-start gap-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 text-sm text-emerald-200">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-xl font-medium">{item.place}</h3>
                      <p className="mt-3 leading-7 text-white/70">{item.idea}</p>
                      <p className="mt-4 border-l border-emerald-300/30 pl-4 text-sm leading-6 text-emerald-100/60">{item.tip}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-amber-200/15 bg-amber-100/[0.04] px-6 py-5 text-sm leading-7 text-amber-50/70">
              <strong className="font-medium text-amber-100">避けたい場所：</strong>
              直射日光が当たる窓辺、暖房器具のそば、エアコンの風が直接当たる場所、温度差の大きい場所、まったく光が届かない場所。ガラス内部が高温になったり、乾燥や蒸れの原因になります。
            </div>
          </Container>
        </section>

        <section id="start" className="scroll-mt-32 border-y border-white/10 bg-[#0a1811] py-20 sm:py-28">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Your first terrarium</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">はじめるのは、<br />難しくありません。</h2>
                <div className="mt-10 space-y-7">
                  {steps.map(([title, description], index) => (
                    <div key={title} className="grid grid-cols-[3rem_1fr] gap-4">
                      <span className="font-serif text-2xl text-emerald-300/60">0{index + 1}</span>
                      <div>
                        <h3 className="text-lg font-medium">{title}</h3>
                        <p className="mt-2 text-sm leading-7 text-white/60">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10">
                <Image
                  src="/images/terrarium-generated/terrarium-artwork-moonlit-wetland-v1.png"
                  alt="静かな水辺を思わせる苔テラリウム"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <p className="absolute bottom-0 p-7 font-serif text-xl leading-relaxed text-white/85">
                  正解はひとつではありません。<br />心が動く景色から始めてみてください。
                </p>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-950/80 to-black/60 px-6 py-12 text-center shadow-2xl shadow-black/25 sm:px-12 sm:py-16">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Choose your beginning</p>
              <h2 className="mt-4 font-serif text-3xl sm:text-5xl">あなたの小さな森を見つけよう</h2>
              <p className="mx-auto mt-6 max-w-2xl leading-8 text-white/65">
                完成した作品を選ぶ、自分の手でつくる、店舗で実物を見る。Moss Countryでは、あなたに合った始め方をご用意しています。
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/shop" className="rounded-full bg-emerald-400 px-7 py-3 font-medium text-stone-950 transition-colors hover:bg-emerald-300">
                  商品を見る
                </Link>
                <Link href="/workshop" className="rounded-full border border-white/35 px-7 py-3 font-medium text-white transition-colors hover:border-emerald-300 hover:text-emerald-200">
                  ワークショップでつくる
                </Link>
                <Link href="/store" className="rounded-full border border-white/35 px-7 py-3 font-medium text-white transition-colors hover:border-emerald-300 hover:text-emerald-200">
                  店舗へ行く
                </Link>
              </div>
              <Link href="/moss-guide" className="mt-7 inline-block text-sm text-emerald-200/70 underline decoration-emerald-300/30 underline-offset-4 hover:text-white">
                テラリウムに使われる苔を知る
              </Link>
            </div>
          </Container>
        </section>

        <aside className="border-t border-white/10 py-12">
          <Container className="max-w-5xl">
            <details className="group rounded-2xl border border-white/10 bg-black/15 px-6 py-5">
              <summary className="cursor-pointer list-none text-sm text-white/60 marker:hidden">
                このページの参考資料
                <span className="float-right text-emerald-300 transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <ul className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs leading-6 text-white/45">
                {references.map((reference) => (
                  <li key={reference.href}>
                    <a href={reference.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-emerald-200">
                      {reference.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </Container>
        </aside>
      </main>
    </div>
  );
}
