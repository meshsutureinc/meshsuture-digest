import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@meshsuture/config", "@meshsuture/core", "@meshsuture/db"],
};

export default nextConfig;
