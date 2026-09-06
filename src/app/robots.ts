import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://verotask.com";
  const publicRule = {
    userAgent: ["Googlebot", "Bingbot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot"],
    allow: "/",
    disallow: ["/api/", "/dashboard/", "/bookings/", "/signin/"]
  };

  return {
    rules: [
      publicRule,
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/bookings/", "/signin/"]
      }
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
    host: base
  };
}
