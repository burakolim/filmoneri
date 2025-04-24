// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⛔ Build sırasında ESLint hatalarını yok say
  },
};

export default nextConfig;
