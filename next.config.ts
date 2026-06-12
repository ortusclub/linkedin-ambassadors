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
};

export default nextConfig;
