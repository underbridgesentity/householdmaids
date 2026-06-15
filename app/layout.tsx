import type { Metadata, Viewport } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { CapacitorInit } from "@/components/CapacitorInit";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sora" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://householdmaids.vercel.app"),
  title: {
    default: "Household Maids, Cleaning services across Gauteng",
    template: "%s · Household Maids",
  },
  description:
    "Book trusted, vetted cleaners across Gauteng in under a minute, and earn cash every time a friend books with your referral link.",
  icons: { icon: "/brand/favicon.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Household Maids" },
  openGraph: {
    title: "Household Maids, Cleaning services across Gauteng",
    description:
      "Book trusted, vetted cleaners across Gauteng in under a minute, and earn cash every time a friend books with your referral link.",
    type: "website",
    locale: "en_ZA",
    siteName: "Household Maids",
    images: [{ url: "/brand/logo.png", width: 800, height: 450, alt: "Household Maids" }],
  },
  twitter: { card: "summary_large_image", title: "Household Maids", description: "Cleaning services across Gauteng, rewarded." },
};

export const viewport: Viewport = {
  themeColor: "#4A2C7C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${jakarta.variable}`}>
      <body>
        {children}
        <PWARegister />
        <CapacitorInit />
      </body>
    </html>
  );
}
