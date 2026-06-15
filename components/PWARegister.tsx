"use client";

import { useEffect } from "react";

/** Registers the service worker (production only) so the app is installable. */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
