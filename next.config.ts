import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["gologin", "puppeteer-core"],
};

export default nextConfig;
