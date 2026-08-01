/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],

  // Static export for production builds (bundled by nitrostack-cli)
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    distDir: 'out',
    images: {
      unoptimized: true,
    },
  }),

  // Development optimizations to prevent cache corruption
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { isServer }) => {
      if (config.cache && config.cache.type === 'filesystem') {
        config.cache = { type: 'memory' };
      }
      if (!isServer) {
        config.cache = false;
      }
      return config;
    },
    devIndicators: {
      buildActivity: false,
    },
    compress: false,
  }),
};

export default nextConfig;
