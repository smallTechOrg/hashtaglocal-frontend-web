import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Only use rewrites if NOT building for static export
  ...(process.env.EXPORT_STATIC !== "true" && {
    async rewrites() {
      return [
        {
          source: "/api/issues",
          destination: "https://staging.api.smalltech.in/local/api/v1/issues",
        },
      ];
    },
  }),
  // Use static export only for GitHub Pages or static hosts
  ...(process.env.EXPORT_STATIC === "true" && {
    output: "export",
  }),
};

export default nextConfig;
