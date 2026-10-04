import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root, so Turbopack resolves @mlduke/ui (symlinked to packages/ui)
  // and its fonts, which sit outside this app.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
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
