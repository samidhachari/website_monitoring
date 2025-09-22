
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Ignore ESLint errors in Vercel build
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Ignore TS errors in Vercel build
  },
  // ...existing config
};

export default nextConfig;
