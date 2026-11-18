import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const INVESTIGATE_STRICT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

const SITE_WIDE_REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/chat": [
      "./corpus/generated/**/*",
      "./content/overlays/veteran/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source:
          "/((?!investigate(?:/|$)|149e9513-01fa-4fb0-aad4-566afd725d1b).*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: SITE_WIDE_REPORT_ONLY_CSP,
          },
        ],
      },
      {
        source: "/investigate",
        headers: [
          {
            key: "Content-Security-Policy",
            value: INVESTIGATE_STRICT_CSP,
          },
        ],
      },
      {
        source: "/investigate/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: INVESTIGATE_STRICT_CSP,
          },
        ],
      },
    ];
  },
};

export default withBotId(nextConfig);
