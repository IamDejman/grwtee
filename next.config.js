/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "www.grwtee.com"
      },
      {
        protocol: "https",
        hostname: "grwtee.com"
      },
      {
        protocol: "http",
        hostname: "localhost"
      }
    ]
  }
};

module.exports = nextConfig;


