import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/workers/sw.ts",
  swDest: "public/sw.js",
  // Disable in development to avoid caching issues
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  transpilePackages: ["@react-pdf/renderer"],
};

export default withSerwist(withNextIntl(nextConfig));
