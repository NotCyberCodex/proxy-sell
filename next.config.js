/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    RUPANTOR_API_KEY: process.env.RUPANTOR_API_KEY,
    SUCCESS_URL: process.env.SUCCESS_URL,
    CANCEL_URL: process.env.CANCEL_URL,
    CALLBACK_URL: process.env.CALLBACK_URL,
  },
  output: 'export', // For Vercel deployment
  trailingSlash: true, // Required for static export with HTML files
  images: {
    unoptimized: true, // Since we're using static export
  },
};

module.exports = nextConfig;