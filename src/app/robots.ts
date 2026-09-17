import type { MetadataRoute } from "next";
import { canonicalAppUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = canonicalAppUrl();
  const publicRule = {
    userAgent: ["Googlebot", "Bingbot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot"],
    allow: "/",
    disallow: ["/api/", "/dashboard/", "/bookings/", "/signin", "/admin", "/dashboard", "/unsubscribe"]
  };

  return {
    rules: [
      publicRule,
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/bookings/", "/signin", "/admin", "/dashboard", "/unsubscribe"]
      }
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
