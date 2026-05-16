/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.rideandchill.fi', 'storage.rideandchill.fi'],
  },
};

module.exports = nextConfig;
