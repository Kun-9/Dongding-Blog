import type { NextConfig } from "next";

/**
 * Output is conditionally `export` only when BUILD_TARGET=static (set by the
 * production `build` script). `next dev` runs without static-export so that
 * dev-only API routes (/api/settings etc.) work for local content authoring.
 *
 * basePath / assetPrefix are likewise applied only for the deployed build —
 * `npm run dev` serves at the root so localhost:3000/admin works directly.
 */
const isStaticBuild = process.env.BUILD_TARGET === "static";
const basePath = isStaticBuild ? "/Dongding-Blog" : "";

const nextConfig: NextConfig = {
  ...(isStaticBuild ? { output: "export" as const } : {}),
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
