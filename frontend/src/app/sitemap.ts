import type { MetadataRoute } from "next";
import { demoSectors } from "./(marketing)/demos/demo-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: "https://bookinaja.com/",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://bookinaja.com/pricing",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://bookinaja.com/demos",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...demoSectors.map((sector) => ({
      url: `https://bookinaja.com/demos/${sector.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
    {
      url: "https://bookinaja.com/faq",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://bookinaja.com/documentation",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://bookinaja.com/discovery",
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];
}
