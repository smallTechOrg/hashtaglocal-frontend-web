import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Only use rewrites if running in dev/server mode (not static export)
  ...(process.env.NODE_ENV !== "production" && {
    async rewrites() {
      return [
        {
          source: "/api/issues",
          destination: "https://staging.api.smalltech.in/local/api/v1/issues",
        },
      ];
    },
  }),
};

export default nextConfig;
