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
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.dailydigest.meshsuture.com https://accounts.dailydigest.meshsuture.com https://*.clerk.accounts.dev",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
              "font-src 'self' data:",
              "connect-src 'self' https://clerk.dailydigest.meshsuture.com https://accounts.dailydigest.meshsuture.com https://*.clerk.accounts.dev https://api.clerk.com",
              "frame-src 'self' https://clerk.dailydigest.meshsuture.com https://accounts.dailydigest.meshsuture.com https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
