import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["gologin", "puppeteer-core", "child_process"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
  async rewrites() {
    return [
      // Static dashboard-layout mockup (to show Sam) — clean URL -> the public/ html file.
      { source: "/dashboard-mockup", destination: "/dashboard-mockup.html" },
    ];
  },
  async redirects() {
    return [
      // Page renamed field-marketing -> promo-team. Keep old links (FB ads) working.
      { source: "/field-marketing", destination: "/promo-team", permanent: true },
    ];
  },
};

export default nextConfig;
