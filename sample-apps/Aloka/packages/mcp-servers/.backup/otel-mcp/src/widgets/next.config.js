/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    distDir: 'out',
    images: { unoptimized: true },
  }),
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
    devIndicators: { buildActivity: false, buildActivityPosition: 'bottom-right' },
    compress: false,
  }),
};
export default nextConfig;
