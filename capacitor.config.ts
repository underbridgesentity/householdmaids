import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Household Maids is a server-rendered Next.js app (auth, DB, server actions),
 * so the native shells load the live site rather than a static bundle. The
 * native plugins (splash, status bar, push) make it a real app, not a wrapper.
 *
 * Point `server.url` at your custom domain once it's live.
 */
const config: CapacitorConfig = {
  appId: "za.co.householdmaids.app",
  appName: "Household Maids",
  webDir: "mobile/www",
  backgroundColor: "#4A2C7C",
  server: {
    url: "https://householdmaids.vercel.app",
    // url: "https://householdmaids.co.za", // <- switch to this when the domain is live
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "householdmaids.vercel.app",
      "householdmaids.co.za",
      "*.payfast.co.za",
      "sandbox.payfast.co.za",
    ],
  },
  ios: { contentInset: "always" },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      backgroundColor: "#4A2C7C",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
