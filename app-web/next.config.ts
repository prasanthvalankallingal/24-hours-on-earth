import type { NextConfig } from "next";

// GitHub Pages serves the site under /<repo-name>/, so all asset + route URLs
// need that prefix. Set via env (the CI workflow passes it) so local dev and
// other hosts (Vercel root) still work with no prefix.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
// Optional: URL of the "Ask the data" language-router Worker. When unset, the
// Ask box uses the local deterministic parser only (no runtime LLM call).
const routerUrl = process.env.NEXT_PUBLIC_ROUTER_URL || "";

const nextConfig: NextConfig = {
  output: "export", // static export → deployable to any static host
  images: { unoptimized: true },
  basePath: basePath || undefined,
  // makes the prefix available to client code that builds asset URLs by hand
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_ROUTER_URL: routerUrl },
  trailingSlash: true, // GitHub Pages serves /path/ → /path/index.html reliably
};

export default nextConfig;
