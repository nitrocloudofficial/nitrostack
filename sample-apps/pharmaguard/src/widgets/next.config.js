/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export for production builds — required so next build writes
  // HTML files to out/ that the NitroStack SDK can read at server startup.
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    distDir: 'out',
    images: {
      unoptimized: true,
    },
  }),

  // Development: disable persistent filesystem cache to prevent stale chunks
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { isServer }) => {
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
