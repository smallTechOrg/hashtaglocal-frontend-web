import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isProduction && { output: "export" }),
  ...(!isProduction && {
    async rewrites() {
      return [
        {
          source: "/api/issues",
          destination: "https://staging.api.smalltech.in/local/api/v1/issues",
        },
        {
          source: "/api/issue/:id",
          destination: "https://staging.api.smalltech.in/local/api/v1/issue/:id",
        },
      ];
    },
  }),
};

export default nextConfig;
