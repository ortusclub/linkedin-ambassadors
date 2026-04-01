import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://klabber.co";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogue`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faqs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/become-ambassador`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Dynamic account pages
  let accountPages: MetadataRoute.Sitemap = [];
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      where: { status: "available", listed: true },
      select: { id: true, updatedAt: true },
    });

    accountPages = accounts.map((account) => ({
      url: `${baseUrl}/account/${account.id}`,
      lastModified: account.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB not available — return static pages only
  }

  return [...staticPages, ...accountPages];
}
