import type { NextConfig } from "next";

/**
 * Vercel SSR/ISR 배포 기준 설정.
 *
 * 정적 export(`output: "export"`) 와 GitHub Pages 용 basePath 는 콘텐츠 정본을
 * Supabase 로 옮기면서 걷어냈다. NEXT_PUBLIC_BASE_PATH 는 클라이언트 코드가
 * 아직 참조하므로 빈 문자열로 남겨 둔다.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
  },

  /**
   * 글 이미지는 Supabase Storage(post-images)에 있지만 본문은 예전처럼
   * `/posts/{slug}/{file}` 을 가리킨다. 그 경로를 여기서 Storage 로 넘긴다.
   *
   * fallback 단계라 페이지 라우트와 public/ 정적 파일을 모두 확인한 뒤에만
   * 동작한다 — 글 상세(`/posts/{slug}`)를 가로챌 일이 없다.
   * 저장소를 옮기게 되면 본문 대신 이 destination 만 고치면 된다.
   */
  async rewrites() {
    if (!SUPABASE_URL) return [];
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/posts/:slug/:file",
          destination: `${SUPABASE_URL}/storage/v1/object/public/post-images/:slug/:file`,
        },
      ],
    };
  },
};

export default nextConfig;
