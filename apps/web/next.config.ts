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
            // Override any restrictive CSP with a permissive policy
            key: "Content-Security-Policy",
            value: "",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
