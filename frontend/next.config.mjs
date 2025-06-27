/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
