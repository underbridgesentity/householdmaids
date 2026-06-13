import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://householdmaids.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep authenticated/app surfaces out of search results.
      disallow: ["/app", "/admin", "/helper/dashboard", "/helper/jobs", "/api/", "/reset/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
