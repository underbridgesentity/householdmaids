import type { Config } from "tailwindcss";

/**
 * Design tokens lifted directly from the Claude Design prototype
 * (Household Maids.dc.html). Brand = purple + orange.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: { brand: "#4A2C7C" },
        magenta: { brand: "#A22D8F" },
        purple: {
          deep: "#6B2F8A",
          deeper: "#3C2168",
          mid: "#7A2E89",
        },
        ink: "#201F4D",
        orange: {
          brand: "#F2960E", // primary CTA
          accent: "#D97A0A", // labels
          deep: "#C9740A",
        },
        money: { DEFAULT: "#1F9D63", dark: "#1F7A4E" },
        surface: {
          DEFAULT: "#f6f4fa",
          lav: "#f3ecfa",
          pink: "#fbeef7",
          card: "#ffffff",
        },
        line: { DEFAULT: "#efe9f5", input: "#e7e1ee" },
        muted: { DEFAULT: "#8a7fa6", soft: "#7c7596", faint: "#a99fbe", label: "#6a6385" },
      },
      fontFamily: {
        display: ["var(--font-sora)", "Sora", "sans-serif"],
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#4A2C7C,#A22D8F)",
        "brand-gradient-160": "linear-gradient(160deg,#4A2C7C 0%,#7A2E89 100%)",
        "hero-gradient": "linear-gradient(155deg,#4A2C7C 0%,#3C2168 58%,#4A2C7C 100%)",
        "wallet-gradient": "linear-gradient(160deg,#A22D8F,#6B2F8A 70%,#4A2C7C)",
        // Admin console: a deep indigo sidebar and a softly-lit light workspace.
        "admin-sidebar": "linear-gradient(184deg,#2a1748 0%,#3a2063 52%,#2c1850 100%)",
        "admin-grid": "radial-gradient(1100px 480px at 100% -8%,#efe9f7 0%,#f5f3fa 46%,#f3f1f8 100%)",
      },
      borderRadius: {
        xl2: "18px",
        xl3: "22px",
      },
      keyframes: {
        hmFade: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        hmPulse: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: ".35" },
        },
      },
      animation: {
        fade: "hmFade .4s ease both",
        pulseSoft: "hmPulse 1.4s infinite",
      },
      boxShadow: {
        card: "0 18px 40px -22px rgba(60,30,90,.5)",
        phone: "0 40px 80px -30px rgba(40,25,80,.45)",
      },
    },
  },
  plugins: [],
};

export default config;
