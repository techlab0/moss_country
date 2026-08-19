// ページ遷移中に即座に表示するローディング。
//
// App Routerでは、遷移先のRSCが返るまで前のページが表示されたままになる。
// loading.tsx が1つも無いと、リンクをクリックしてから応答が返るまで画面が
// まったく変化せず、「押しても反応しない」ように見える。実測では温まった状態でも
// 0.4〜0.9秒、コールドスタート時はさらにかかるため、無反応に感じる時間が長い。
//
// このファイルはルート直下に置いてあるので、個別の loading.tsx を持たない
// すべてのページ遷移に適用される。

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-moss-green"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-moss-green">読み込み中...</p>
      <span className="sr-only">ページを読み込んでいます</span>
    </div>
  );
}
