import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Security headers applied to every response. CSP is intentionally strict;
// 'unsafe-inline' on styles is required for Next's runtime style injection.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is only needed for the dev/HMR runtime; drop it in production.
      // 'unsafe-inline' stays for Next's inline bootstrap scripts (a nonce-based
      // policy is the next hardening step).
      isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.payfast.co.za https://payfast.co.za",
      // Payfast checkout posts to www.payfast.co.za then redirects through other
      // subdomains (w1w/w2w/sandbox); form-action must allow the whole domain or
      // the browser blocks the navigation mid-redirect.
      "form-action 'self' https://*.payfast.co.za https://payfast.co.za",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: { qualities: [75, 90] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
