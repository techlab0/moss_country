import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    formats: ['image/webp', 'image/avif'], // 次世代フォーマット
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  trailingSlash: false,
  output: 'standalone',
  compress: true, // gzip圧縮
  poweredByHeader: false, // セキュリティのためX-Powered-Byヘッダーを非表示
  experimental: {
    optimizeCss: true, // CSS最適化
    scrollRestoration: true,
  },
  turbopack: {
    resolveAlias: {
      '@/': './src/',
    },
  },
};

export default nextConfig;
