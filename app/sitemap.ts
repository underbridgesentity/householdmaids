import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://householdmaids.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/helper", "/login", "/signup", "/terms", "/privacy"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
