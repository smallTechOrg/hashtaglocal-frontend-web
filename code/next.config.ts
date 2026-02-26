import type { NextConfig } from "next";
import { API_PATHS } from "./src/app/constants/api";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isProduction && { output: "export" }),
  ...(!isProduction && {
    async rewrites() {
      return [
        {
          source: "/api/issues",
          destination: API_PATHS.issues,
        },
        {
          source: "/api/issue/:id",
          destination: API_PATHS.issue(":id"),
        },
      ];
    },
  }),
};

export default nextConfig;
