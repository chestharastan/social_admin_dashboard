import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Up to ten 10 MB images, plus multipart metadata, can be sent per batch.
      bodySizeLimit: '101mb',
    },
  },
};

export default nextConfig;
