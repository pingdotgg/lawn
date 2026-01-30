import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      // Add your S3 endpoint hostname here if you need to serve thumbnails
      // {
      //   protocol: "https",
      //   hostname: "your-s3-endpoint.railway.app",
      // },
    ],
  },
};

export default nextConfig;
