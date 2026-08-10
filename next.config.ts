import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
