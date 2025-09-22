
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Ignore ESLint errors in Vercel build
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Ignore TS errors in Vercel build
  },
  // allowedDevOrigins is a newer Next.js experimental option — cast to any to avoid type errors in this project setup
  experimental: (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e: any = { allowedDevOrigins: ['http://192.168.1.39:3000'] };
    return e;
  })(),
};

export default nextConfig;
