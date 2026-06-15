import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Household Maids",
    short_name: "Household Maids",
    description: "Book trusted, vetted cleaners across Gauteng, and earn cash on every referral.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#4A2C7C",
    theme_color: "#4A2C7C",
    orientation: "portrait",
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
