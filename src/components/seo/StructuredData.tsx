'use client';

export function StructuredData() {
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://moss-country.com/#organization",
    "name": "MOSS COUNTRY",
    "url": "https://moss-country.com",
    "logo": "https://moss-country.com/images/mosscountry_logo.svg",
    "description": "北海道初のカプセルテラリウム専門店。職人が手がける本格テラリウムと体験ワークショップを提供。",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "発寒11条4丁目3-1",
      "addressLocality": "札幌市",
      "addressRegion": "北海道",
      "postalCode": "063-0831",
      "addressCountry": "JP"
    },
    "telephone": "080-3605-6340",
    "email": "moss.country.kokenokuni@gmail.com",
    "openingHours": "Mo-Su 11:00-20:00",
    "priceRange": "¥¥",
    "image": [
      "https://moss-country.com/images/misc/moss01.jpeg",
      "https://moss-country.com/images/products/moss-country_products_bottle.png"
    ],
    "sameAs": [
      "https://instagram.com/moss_country"
    ],
    "makesOffer": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Product",
          "name": "テラリウム",
          "description": "職人が手がける本格的なカプセルテラリウム"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "テラリウムワークショップ",
          "description": "自分の手で作る特別なテラリウム体験"
        }
      }
    ]
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://moss-country.com/#website",
    "url": "https://moss-country.com",
    "name": "MOSS COUNTRY",
    "description": "北海道の苔テラリウム専門店",
    "publisher": {
      "@id": "https://moss-country.com/#organization"
    },
    "inLanguage": "ja-JP"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteData)
        }}
      />
    </>
  );
}