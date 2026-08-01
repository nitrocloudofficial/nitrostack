/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],
  turbopack: {
    root: __dirname,
  },
  // Keep development and production compiler artifacts isolated.  Reusing
  // `.next` while Studio/dev and a static build run at the same time leaves
  // the dev server pointing at chunks that the build has replaced.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : 'out',
  
  // Static export for production builds
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    images: {
      unoptimized: true,
    },
  }),
  
  // Development optimizations to prevent cache corruption
  ...(process.env.NODE_ENV === 'development' && {
    // NitroStack Studio advertises dev widgets under /widgets/<route>.
    // Serve those URLs from the matching Next.js app route.
    async rewrites() {
      return [
        {
          source: '/widgets/:path*',
          destination: '/:path*',
        },
      ];
    },

    // Faster dev server
    compress: false,
  }),
};

module.exports = nextConfig;
