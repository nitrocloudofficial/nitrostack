/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack', '@nitrostack/widgets'],
  
  // Static export for all builds to ensure NitroStack can serve HTML resources
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
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
    },
    compress: false,
  }),
};

export default nextConfig;
