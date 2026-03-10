import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@meshsuture/config", "@meshsuture/core", "@meshsuture/db"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Fully permissive CSP — allow everything so Clerk + Turnstile work
            key: "Content-Security-Policy",
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
