import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// Change 'voiceover-studio' to your actual GitHub repo name when deploying
const repoName = process.env.GITHUB_REPO_NAME || "voice-over-studio";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // Only set basePath in production (GitHub Pages)
  ...(isProd && {
    basePath: `/${repoName}`,
    assetPrefix: `/${repoName}/`,
  }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
