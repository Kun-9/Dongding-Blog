import type { NextConfig } from "next";

/**
 * Vercel SSR/ISR 배포 기준 설정.
 *
 * 정적 export(`output: "export"`) 와 GitHub Pages 용 basePath 는 콘텐츠 정본을
 * Supabase 로 옮기면서 걷어냈다. NEXT_PUBLIC_BASE_PATH 는 클라이언트 코드가
 * 아직 참조하므로 빈 문자열로 남겨 둔다.
 */
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
  },
};

export default nextConfig;
