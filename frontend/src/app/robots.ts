import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/demos", "/faq", "/documentation", "/tenants"],
        disallow: ["/dashboard/", "/user/", "/login", "/register"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
      },
      {
        userAgent: "GPTBot",
        allow: "/",
      },
    ],
    sitemap: "https://bookinaja.com/sitemap.xml",
    host: "https://bookinaja.com",
  };
}
