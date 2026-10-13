/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],

  // Static export for production builds
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    distDir: 'out',
    images: {
      unoptimized: true,
    },
  }),

  // Development optimizations to prevent cache corruption
  ...(process.env.NODE_ENV === 'development' && {
    // Use memory cache instead of filesystem cache in dev to avoid stale chunks
    webpack: (config, { isServer }) => {
      if (config.cache && config.cache.type === 'filesystem') {
        config.cache = {
          type: 'memory',
        };
      }

      if (!isServer) {
        config.cache = false;
      }

      return config;
    },

    devIndicators: {
      buildActivity: false,
      buildActivityPosition: 'bottom-right',
    },

    compress: false,
  }),
};

export default nextConfig;
