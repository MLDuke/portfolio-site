import path from "node:path";
import type { NextConfig } from "next";
import { siteOrigin } from "./app/metadata";

const nextConfig: NextConfig = {
  // The repo root, so Turbopack resolves @mlduke/ui (symlinked to packages/ui)
  // and its fonts, which sit outside this app.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    // The site moved from matthewdukedesign.com, so old links land on the
    // same path at the new origin. www.mlduke.design redirects in Vercel's
    // domain settings.
    return ["matthewdukedesign.com", "www.matthewdukedesign.com"].map(
      (host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: `${siteOrigin}/:path*`,
        permanent: true,
      }),
    );
  },
};

export default nextConfig;
