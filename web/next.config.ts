import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Almost every page is per-user (session cookies), so we use classic dynamic
  // rendering instead of Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    localPatterns: [{ pathname: "/files/**" }],
  },
  serverExternalPackages: ["mysql2"],
};

export default nextConfig;
