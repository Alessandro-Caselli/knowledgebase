import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.microsoft.com' },
      { protocol: 'https', hostname: '**.microsoftonline.com' },
      { protocol: 'https', hostname: 'graph.microsoft.com' },
    ],
  },
};

export default nextConfig;
