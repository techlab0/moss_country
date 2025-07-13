import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['cdn.sanity.io'],
  },
  trailingSlash: false,
  output: 'standalone',
};

export default nextConfig;
