import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevents double-mounting in dev mode which causes visible jitter
  reactStrictMode: false,
  // Enable experimental optimizations
  experimental: {
    // Enables package-level tree shaking for framer-motion
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
};

export default nextConfig;
