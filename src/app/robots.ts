import type { MetadataRoute } from "next";
import { canonicalAppUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = canonicalAppUrl();

  return {
    rules: [
      {
        userAgent: ["Googlebot", "Bingbot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot"],
        allow: "/",
        disallow: ["/api/"]
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
