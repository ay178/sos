/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}
module.exports = nextConfig
