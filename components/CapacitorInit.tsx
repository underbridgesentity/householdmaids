"use client";

import { useEffect } from "react";

/**
 * Initialises native behaviour when the web app runs inside the Capacitor
 * shell (iOS/Android). On the web this is a no-op. Dynamic imports keep the
 * Capacitor plugins out of the server bundle and out of the critical path.
 */
export function CapacitorInit() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || !Capacitor.isNativePlatform()) return;

      // Tint the status bar to the brand and keep content below it.
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark }); // light text on the purple brand
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#4A2C7C" });
        }
      } catch {
        /* status bar unavailable; ignore */
      }

      // Hide the launch splash once the live site has painted.
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* splash unavailable; ignore */
      }

      // Android hardware back: go back in history, or exit at the root.
      try {
        const { App } = await import("@capacitor/app");
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
      } catch {
        /* app plugin unavailable; ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
