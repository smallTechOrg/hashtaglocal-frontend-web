import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Static export for GitHub Pages
  ...(process.env.EXPORT_STATIC === "true" && {
    output: "export",
  }),
  // Rewrites proxy for local dev & server deployments
  ...(!process.env.EXPORT_STATIC && {
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
