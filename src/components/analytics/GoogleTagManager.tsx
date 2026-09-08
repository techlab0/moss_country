import Script from 'next/script';

// Google Tag Manager の読み込み。コンテナIDは管理画面（サイト設定 > SEO・計測）で変更できる。
// IDが未設定・形式不正のときは何も出力せず、計測タグ由来でページが壊れないようにする。

interface Props {
  containerId: string;
}

export function GoogleTagManagerScript({ containerId }: Props) {
  if (!containerId) return null;

  return (
    <Script
      id="gtm-init"
      // afterInteractive を使い、GTMの読み込みが初期表示のレンダリングを遅らせないようにする。
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');`,
      }}
    />
  );
}

// JavaScriptが無効な環境向けのフォールバック。GTMの仕様上 body の直後に置く必要がある。
export function GoogleTagManagerNoScript({ containerId }: Props) {
  if (!containerId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${containerId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
