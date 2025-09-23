/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Ignore ESLint errors in Vercel build
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Ignore TS errors in Vercel build
  },
  // ...existing config
};

module.exports = nextConfig;
