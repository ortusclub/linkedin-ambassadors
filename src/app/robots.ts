import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";

const DISALLOWED_PATHS = ["/admin/", "/dashboard/", "/profile/", "/checkout/", "/api/", "/inventory/"];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "GoogleOther",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "Amazonbot",
  "DuckAssistBot",
  "YouBot",
  "cohere-ai",
  "Diffbot",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const brand = await getBrand();
  return {
    rules: [
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOWED_PATHS,
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${brand.url}/sitemap.xml`,
    host: brand.url,
  };
}
