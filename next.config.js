/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Set the API URL for local development
    NEXT_PUBLIC_API_URL:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/api"
        : undefined,
  },
  // Disable image optimization for local static images
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
