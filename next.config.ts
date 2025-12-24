import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig & { turbopack?: { root?: string } } = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
    domains: ['images.unsplash.com', 'localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  typescript: {
    // Temporarily ignore build-time type errors in generated Next.js dev types
    ignoreBuildErrors: true,
  },
  // Enable static exports for the standalone output
  output: 'standalone',
  turbopack: {
    // Ensure Turbopack uses the project folder as root to avoid lockfile warnings
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
