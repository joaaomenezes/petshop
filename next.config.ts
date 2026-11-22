import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          {
            protocol: new URL(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
            ).protocol.slice(0, -1) as "https" | "http",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            port: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).port,
            pathname: "/storage/v1/object/sign/product-images/**",
          },
        ]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
