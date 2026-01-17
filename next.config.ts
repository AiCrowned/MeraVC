import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/MeraVC',
  assetPrefix: '/MeraVC',
};

export default nextConfig;
