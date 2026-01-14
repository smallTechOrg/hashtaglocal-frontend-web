import type { NextConfig } from "next";
const isProd = process.env.NODE_ENV === 'production';
const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? '/hashtag-frontend-web' : '',
  assetPrefix: isProd ? '/hashtag-frontend-web' : '',
  images: { unoptimized: true },
};

export default nextConfig;
