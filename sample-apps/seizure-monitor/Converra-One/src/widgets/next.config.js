/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],
  turbopack: {},
  
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
    // Disable build activity indicator which can cause issues
    devIndicators: {
      buildActivityPosition: 'bottom-right',
    },
    
    // Faster dev server
    compress: false,
  }),
};

export default nextConfig;
