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
    devIndicators: false,
    compress: false,
  }),
};

export default nextConfig;
