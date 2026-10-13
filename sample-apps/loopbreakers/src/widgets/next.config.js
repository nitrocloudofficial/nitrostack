/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nitrostack/core', '@nitrostack/widgets'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
