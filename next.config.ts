import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  // Next 15+/16 blocks cross-origin requests to dev-only endpoints (HMR,
  // RSC payloads, server actions) by default. When the app is exposed via
  // a tunnel (ngrok, cloudflared, localtunnel, …) the browser origin
  // doesn't match the dev server's localhost, so React's hydration RSC
  // fetch silently fails and every onClick / onChange becomes inert
  // (sidebar chevrons, password toggle, modals, …). Allow-listing the
  // common tunnel domains fixes it.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
};

export default nextConfig;
