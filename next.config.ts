import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["gologin", "puppeteer-core", "child_process"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "media.licdn.com" },
    ],
  },
};

export default nextConfig;
