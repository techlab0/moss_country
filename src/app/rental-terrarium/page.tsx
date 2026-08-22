import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: '法人向け 苔テラリウムレンタル | Moss Country',
  description: 'オフィス・店舗・ホテル・クリニックなどへ、定期メンテナンス付きの苔テラリウムをお届けします。',
  robots: { index: false, follow: false, nocache: true },
};

const highlights = [
  ['月額', '8,800円（税込）〜'],
  ['最低契約期間', '6か月'],
  ['メンテナンス', '月1回程度'],
  ['作品交換', '3か月に1度'],
  ['フィギュア', 'おまかせで追加無料'],
  ['対応エリア', '北海道内'],
];

const longTermPlans = [
  ['Mini', '約10cm', '2,200円〜'], ['Small', '約15cm', '4,400円〜'],
  ['Medium', '約20cm', '6,600円〜'], ['Large', '約25〜30cm', '9,900円〜'],
  ['Premium', '約30〜45cm', '16,500円〜'], ['Order Made', '45cm以上', '個別お見積り'],
];

const shortTermPlans = [
  ['Mini', '約10cm', '2,200円', '3,300円', '4,400円'],
  ['Small', '約15cm', '3,300円', '4,950円', '6,600円'],
  ['Medium', '約20cm', '4,400円', '6,600円', '8,800円'],
  ['Large', '約25〜30cm', '6,600円', '9,900円', '13,200円'],
  ['Premium', '約30〜45cm', '11,000円', '16,500円', '22,000円'],
  ['Order Made', '45cm以上', '個別見積り', '個別見積り', '個別見積り'],
];

const deliveryFees = [
  ['札幌市内', '3,300円〜', '5,500円〜'],
  ['札幌市外・30km以内', '4,400円〜', '7,700円〜'],
  ['30〜60km', '6,600円〜', '11,000円〜'],
  ['60〜100km', '8,800円〜', '16,500円〜'],
  ['100km以上', '個別お見積り', '個別お見積り'],
];

const steps = ['お問い合わせ', '設置場所・サイズ・数量・ご予算をヒアリング', '作品・レンタルプランをご提案', 'お見積り・ご契約', '搬入・設置', '月1回程度の定期メンテナンス', '3か月に1度、新しい作品へ交換'];

const sectionTitle = 'text-2xl md:text-4xl font-bold text-[#173b27] tracking-tight';

export default function RentalTerrariumPage() {
  return (
    <main className="min-h-screen bg-[#f5f3eb] text-[#26362d]">
      <section className="relative min-h-[78vh] overflow-hidden flex items-end">
        <Image src="/images/terrarium-generated/terrarium-hero-key-030-v1.png" alt="深い緑の苔と植物で構成された大型苔テラリウム" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <Container className="relative z-10 pb-16 pt-36 md:pb-24">
          <p className="mb-5 text-sm font-semibold tracking-[0.28em] text-emerald-100">FOR BUSINESS</p>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-7xl">苔のある生活を、<br />あなたの空間へ。</h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-white/90 md:text-xl">作品の設置だけでなく、定期メンテナンスから作品交換まで専門店がサポート。管理の負担を抑えながら、身近に自然を感じられる空間をご提案します。</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-full bg-white px-7 py-3.5 font-bold text-[#173b27] transition hover:bg-emerald-50">導入について相談する</Link>
            <a href="#plans" className="rounded-full border border-white/70 bg-black/20 px-7 py-3.5 font-bold text-white backdrop-blur-sm transition hover:bg-white/10">料金を見る</a>
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
            <div><p className="text-sm font-semibold tracking-[0.24em] text-emerald-200">A LIVING LANDSCAPE</p><h2 className="mt-4 text-3xl font-bold leading-snug md:text-5xl">目に入るたび、<br />呼吸が少し深くなる。</h2><p className="mt-6 leading-8 text-white/80">受付やエントランス、応接室、待合室、ラウンジへ。静かな存在感を持つ苔の景色が、訪れる方と働く方をやさしく迎えます。</p></div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]"><Image src="/images/terrarium-generated/terrarium-artwork-basalt-ravine-v1.png" alt="岩と苔の渓谷を表現した苔テラリウム" fill className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" /></div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]"><Image src="/images/terrarium-generated/terrarium-artwork-woodland-arch-v1.png" alt="流木のアーチと苔の森を表現した苔テラリウム" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div>
            <div className="flex items-center rounded-[2rem] border border-white/15 bg-white/5 p-8 md:p-12"><div><h3 className="text-2xl font-bold">空間に合わせた一点もの</h3><p className="mt-4 leading-8 text-white/75">設置場所、サイズ、光の入り方、ご予算を伺い、空間の雰囲気に合う作品をご提案します。複数作品を組み合わせたご利用も可能です。</p></div></div>
          </div>
        </Container>
      </section>

      <section id="plans" className="py-20 md:py-28">
        <Container>
          <p className="text-sm font-bold tracking-[0.2em] text-[#557962]">LONG-TERM RENTAL</p><h2 className={`${sectionTitle} mt-3`}>長期レンタル料金</h2>
          <p className="mt-5 leading-7">最低ご契約金額は月額8,800円（税込）から。作品の組み合わせも可能です。</p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#c4cec6] bg-white"><table className="w-full min-w-[620px] text-left"><thead className="bg-[#e5ebe6] text-[#173b27]"><tr><th className="p-4">プラン</th><th className="p-4">サイズ目安</th><th className="p-4">月額料金（税込）</th></tr></thead><tbody>{longTermPlans.map(row => <tr key={row[0]} className="border-t border-[#d6ddd7]">{row.map(cell => <td key={cell} className="p-4">{cell}</td>)}</tr>)}</tbody></table></div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-7 shadow-sm"><h3 className="text-xl font-bold text-[#173b27]">料金に含まれるサービス</h3><ul className="mt-5 space-y-3 leading-7"><li>・苔テラリウム作品のレンタル</li><li>・月1回程度の状態確認、剪定、お手入れ、清掃、微調整</li><li>・必要に応じた補修と管理方法のサポート</li><li>・3か月に1度の新しい作品への交換</li></ul></div>
            <div className="rounded-2xl bg-[#dfe9df] p-7"><h3 className="text-xl font-bold text-[#173b27]">オプション</h3><ul className="mt-5 space-y-3 leading-7"><li><strong>育成LEDライト：</strong>月額550円〜／台</li><li><strong>育成LEDライト＋タイマー：</strong>月額880円〜／セット</li><li><strong>おまかせフィギュア：</strong>追加無料</li></ul><p className="mt-4 text-sm text-[#526257]">自然光が十分確保できない設置場所では、育成LEDライトをご提案する場合があります。</p></div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-20 md:py-28">
        <Container>
          <p className="text-sm font-bold tracking-[0.2em] text-[#557962]">SHORT-TERM RENTAL</p><h2 className={`${sectionTitle} mt-3`}>イベント・展示会向け短期レンタル</h2><p className="mt-5 leading-7">最短1週間から。催事、撮影、モデルルーム、期間限定店舗などにご利用いただけます。</p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#c4cec6]"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#e5ebe6] text-[#173b27]"><tr><th className="p-4">プラン</th><th className="p-4">サイズ</th><th className="p-4">1週間</th><th className="p-4">2週間</th><th className="p-4">1か月</th></tr></thead><tbody>{shortTermPlans.map(row => <tr key={row[0]} className="border-t border-[#d6ddd7]">{row.map(cell => <td key={cell} className="p-4">{cell}</td>)}</tr>)}</tbody></table></div>
          <p className="mt-4 text-sm text-[#5a665e]">短期レンタルには最低契約金額・定期交換サービスは適用されません。店頭で受取・返却できる作品は無料です。</p>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container>
          <h2 className={sectionTitle}>搬入・設置とメンテナンス</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#c4cec6] bg-white"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#e5ebe6] text-[#173b27]"><tr><th className="p-4">エリア</th><th className="p-4">長期：初回搬入・設置</th><th className="p-4">短期：搬入・設置・回収</th></tr></thead><tbody>{deliveryFees.map(row => <tr key={row[0]} className="border-t border-[#d6ddd7]">{row.map(cell => <td key={cell} className="p-4">{cell}</td>)}</tr>)}</tbody></table></div>
          <div className="mt-8 grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-[#c4cec6] p-7"><h3 className="font-bold text-[#173b27]">札幌市内</h3><p className="mt-3 leading-7">月1回程度の定期訪問費は月額料金に含まれ、追加の訪問料金はかかりません。</p></div><div className="rounded-2xl border border-[#c4cec6] p-7"><h3 className="font-bold text-[#173b27]">札幌市外</h3><p className="mt-3 leading-7">メンテナンス自体は月額料金に含まれます。距離に応じた訪問・交通費は別途必要です。</p></div></div>
        </Container>
      </section>

      <section className="bg-[#e5ebe4] py-20 md:py-28">
        <Container><h2 className={sectionTitle}>おすすめの設置場所</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['オフィス・企業','受付／エントランス／応接室／会議室'],['店舗・美容室・飲食店','受付／レジ／店内ディスプレイ'],['病院・クリニック','受付／待合室'],['ホテル・宿泊施設','フロント／ロビー／ラウンジ'],['介護・福祉施設','受付／共有スペース'],['イベント・展示会','ブース装飾／期間限定展示／撮影／催事']].map(([title,desc]) => <div key={title} className="bg-white p-7"><h3 className="font-bold text-[#173b27]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5b685f]">{desc}</p></div>)}</div></Container>
      </section>

      <section className="py-20 md:py-28"><Container><h2 className={sectionTitle}>導入までの流れ</h2><div className="mt-10 grid gap-3">{steps.map((step, i) => <div key={step} className={`flex items-center gap-5 border p-5 md:p-6 ${i === steps.length - 1 ? 'border-[#557962] bg-[#e3ebe4]' : 'border-[#bcc8bf] bg-white'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173b27] text-sm font-bold text-white">{String(i + 1).padStart(2, '0')}</span><p className="font-bold text-[#173b27]">{step}</p></div>)}</div></Container></section>

      <section className="bg-[#173b27] py-20 text-white"><Container><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold tracking-[0.24em] text-emerald-200">MOSS COUNTRY</p><h2 className="mt-4 text-3xl font-bold md:text-5xl">空間に合う苔の景色を、<br />一緒に考えませんか。</h2><p className="mt-6 leading-8 text-white/75">設置場所・サイズ・数量・ご予算がお決まりでない段階でも、お気軽にご相談ください。</p><Link href="/contact" className="mt-9 inline-block rounded-full bg-white px-8 py-4 font-bold text-[#173b27] transition hover:bg-emerald-50">お問い合わせはこちら</Link></div></Container></section>

      <section className="bg-[#f5f3eb] py-12"><Container><details className="mx-auto max-w-4xl rounded-xl border border-[#c3cdc5] bg-white p-5"><summary className="cursor-pointer font-bold text-[#173b27]">ご契約条件・注意事項</summary><div className="mt-5 space-y-4 text-sm leading-7 text-[#536158]"><p>長期レンタルは最低契約期間6か月、最低契約金額は月額8,800円（税込）です。6か月経過後は1か月単位で継続でき、解約は希望日の1か月前までにご連絡ください。最低契約期間内の途中解約は、原則として残期間分の料金をご負担いただきます。</p><p>3か月以内の期間外交換には、Mini 1,200円、Small 2,000円、Medium 2,640円、Large 3,960円、Premium 6,600円（すべて税込）、Order Madeは個別見積りの交換料と訪問・配送費がかかります。交換日から新たに3か月の交換サイクルが始まります。</p><p>通常の設置・使用環境で発生した苔や植物の傷みは基本メンテナンスの範囲で対応します。お客様の故意・過失による容器の破損、転倒、大幅な作品崩れ、備品の破損・紛失、修復困難な損傷は修理費または作品代金をご負担いただく場合があります。</p><p>大型作品、複数作品、特殊な搬入条件、遠方への訪問、冬季の天候・道路状況等により、料金や訪問日を個別にご相談する場合があります。</p></div></details></Container></section>
    </main>
  );
}
