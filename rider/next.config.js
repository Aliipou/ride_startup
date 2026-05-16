/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

let nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
};

if (!isDev) {
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: false,
    workboxOptions: {
      disableDevLogs: true,
    },
  });
  nextConfig = withPWA(nextConfig);
}

module.exports = nextConfig;
