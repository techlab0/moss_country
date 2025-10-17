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
  experimental: {
    scrollRestoration: true,
  },
  webpack: (config, { isServer }) => {
    // SendGridをサーバーサイドでのみ使用
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        crypto: false,
      };
    }

    // 動的インポートによりSupabaseエラーは回避されるため、extern設定は不要

    return config;
  },
  turbopack: {
    resolveAlias: {
      '@/': './src/',
    },
  },
};

export default nextConfig;
