/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],
  
  // Development optimizations to prevent cache corruption
  ...(process.env.NODE_ENV === 'development' && {
    // Use memory cache instead of filesystem cache in dev to avoid stale chunks
    webpack: (config, { isServer }) => {
      // Disable persistent caching in development to prevent chunk reference errors
      if (config.cache && config.cache.type === 'filesystem') {
        config.cache = {
          type: 'memory',
        };
      }
      
      // Improve cache busting for new files
      if (!isServer) {
        config.cache = false; // Disable cache completely on client in dev
      }
      
      return config;
    },
    
    // Disable build activity indicator which can cause issues
    devIndicators: {
      buildActivity: false,
      buildActivityPosition: 'bottom-right',
    },
    
    // Faster dev server
    compress: false,
  }),
};

export default nextConfig;
