import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages that export TypeScript source directly.
  transpilePackages: ["@calorielog/contracts", "@calorielog/db"],
};

export default nextConfig;
