import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ["10.60.52.36", "timurmandali.lcwaikiki.local", "timurmandali"],
};

export default nextConfig;
