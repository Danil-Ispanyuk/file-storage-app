import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Disable Lightning CSS to avoid native binary issues on macOS (Gatekeeper/quarantine).
    optimizeCss: false,
  },
  // Enable standalone output for Docker
  output: "standalone",
};

export default nextConfig;
