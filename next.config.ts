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
   * 카드 라우트는 satori 로 SVG 를 그리면서 `assets/` 의 폰트 서브셋을
   * `readFile` 로 읽는다. 정적 분석으로는 안 잡혀서 명시하지 않으면 번들에
   * 빠지고, 로컬은 멀쩡한데 배포에서만 ENOENT 로 죽는다.
   */
  outputFileTracingIncludes: {
    "/card": ["./assets/**"],
    "/card/app/[slug]": ["./assets/**"],
  },

  /**
   * apex 로 들어오면 blog 서브도메인으로 보낸다.
   * 같은 사이트가 두 주소로 열리면 검색엔진이 중복 콘텐츠로 보는데,
   * sitemap·RSS·OG 는 이미 blog.dongding.dev 를 정본으로 가리키고 있다.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "dongding.dev" }],
        destination: "https://blog.dongding.dev/:path*",
        permanent: true,
      },
    ];
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
