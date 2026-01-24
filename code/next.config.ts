import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: "/api/issues",
        destination: "https://staging.api.smalltech.in/local/api/v1/issues",
      },
    ];
  },
};

export default nextConfig;
