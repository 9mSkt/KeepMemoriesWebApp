import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e server builds into its own folder so it can run alongside `pnpm dev` without corrupting `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Let phones on the local network load dev assets (http://192.168.x.x:3000 etc.).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
};

export default nextConfig;
