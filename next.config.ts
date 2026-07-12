import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Legacy share links used /compare?cities=...&start=...&end=... —
        // query params are passed through to the destination by default.
        // The i18n proxy then redirects "/" to the visitor's "/<locale>".
        source: "/compare",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
