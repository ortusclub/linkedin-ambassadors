import type { MetadataRoute } from "next";

const DISALLOWED_PATHS = ["/admin/", "/dashboard/", "/profile/", "/checkout/", "/api/"];

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

export default function robots(): MetadataRoute.Robots {
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
    sitemap: "https://klabber.co/sitemap.xml",
    host: "https://klabber.co",
  };
}
