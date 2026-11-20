import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  outputFileTracingIncludes: { "/results": ["./lib/soil-preview-regions.json"] },
};

export default nextConfig;
