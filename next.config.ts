import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  experimental: {
    dynamicIO: true,
  }
};

export default nextConfig;
