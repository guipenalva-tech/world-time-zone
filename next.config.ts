import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Legacy share links used /compare?cities=...&start=...&end=... —
        // query params are passed through to the destination by default.
        source: "/compare",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
