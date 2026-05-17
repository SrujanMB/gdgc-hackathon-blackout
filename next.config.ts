import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  devIndicators: {
    position: "top-right",
  },
  allowedDevOrigins: ["ace.srujanmb.com"],
};

export default nextConfig;
