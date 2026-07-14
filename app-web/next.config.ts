import type { NextConfig } from "next";

// GitHub Pages serves the site under /<repo-name>/, so all asset + route URLs
// need that prefix. Set via env (the CI workflow passes it) so local dev and
// other hosts (Vercel root) still work with no prefix.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export", // static export → deployable to any static host
  images: { unoptimized: true },
  basePath: basePath || undefined,
  // makes the prefix available to client code that builds asset URLs by hand
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  trailingSlash: true, // GitHub Pages serves /path/ → /path/index.html reliably
};

export default nextConfig;
