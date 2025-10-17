import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MOSS COUNTRY - 北海道の苔テラリウム専門店',
    short_name: 'MOSS COUNTRY',
    description: '小さなガラスの中に広がる、無限の自然の世界',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669', // emerald-600
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/images/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    orientation: 'portrait-primary',
    scope: '/',
    id: 'moss-country',
    lang: 'ja',
    categories: ['shopping', 'lifestyle', 'education'],
  }
}