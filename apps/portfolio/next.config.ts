import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.matthewdukedesign.com",
          },
        ],
        destination: "https://matthewdukedesign.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
