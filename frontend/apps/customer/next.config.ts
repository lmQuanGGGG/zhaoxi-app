import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.1.12", "localhost"],
  transpilePackages: ["@zhaoxi/branding", "@zhaoxi/ui", "@zhaoxi/driver"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
