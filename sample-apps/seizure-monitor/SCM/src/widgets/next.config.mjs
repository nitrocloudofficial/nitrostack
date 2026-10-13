/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],

  // Static export for ALL builds (NitroStack always uses the exported static files)
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },

  // Skip ESLint + TS type-checking during widget build to prevent CI memory hangs.
  // The root tsconfig / nitrostack-cli build already covers type safety.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
