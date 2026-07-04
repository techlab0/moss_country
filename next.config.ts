import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
  compress: true, // gzip圧縮
  poweredByHeader: false, // セキュリティのためX-Powered-Byヘッダーを非表示
  async headers() {
    // 注意: Content-Security-Policyは、Square Web Payments SDK（外部スクリプト・iframe）や
    // Sanity Studio（/admin/cms）を壊さないよう、本番の決済導線で十分に検証してから
    // 別途追加すること。ここではCSPを除く、互換性リスクの低いヘッダーのみ設定する。
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  experimental: {
    scrollRestoration: true,
  },
  webpack: (config, { isServer }) => {
    // クライアントサイドでnode.jsモジュールのフォールバック設定
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        crypto: false,
      };
    }

    return config;
  },
  turbopack: {
    resolveAlias: {
      '@/': './src/',
    },
  },
};

export default nextConfig;
