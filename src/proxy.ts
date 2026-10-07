/**
 * Proxy (Next 16 에서 middleware 가 개명된 것).
 *
 * 두 가지만 한다.
 *  1. Supabase 세션 쿠키 갱신 — 서버 컴포넌트는 쿠키를 못 쓰므로 여기서 굴린다.
 *  2. 편집 화면에 대한 낙관적 리다이렉트.
 *
 * 여기서의 판단은 쿠키를 본 결과일 뿐이라 신뢰의 근거가 아니다. 실제 차단은
 * 각 페이지·라우트가 `lib/auth` 의 requireUser / requireApiUser 로 한 번 더 한다.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** 로그인해야 열리는 화면. 편집 API 는 각 라우트가 401 로 직접 막는다. */
const PROTECTED = ["/studio", "/admin", "/settings", "/manage", "/drafts", "/preview"];

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // 이 호출이 만료 직전 토큰을 갱신하고 위 setAll 로 새 쿠키를 실어 보낸다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (needsAuth && !user) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    // 로그인 후 원래 가려던 곳으로 돌려보낸다.
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  if (path === "/login" && user) {
    const to = req.nextUrl.clone();
    to.pathname = "/studio";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return res;
}

export const config = {
  // 정적 파일과 이미지는 건너뛴다 — 매 요청 세션 갱신을 돌릴 이유가 없다.
  // MCP 와 OAuth 메타데이터도 마찬가지다: 쿠키가 아니라 Bearer 토큰으로 인증하므로
  // 도구 호출마다 Supabase 세션 갱신을 왕복시킬 이유가 없다. 릴리스 실행기 API 도
  // Bearer 로만 인증한다.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/mcp|api/releases/worker|\\.well-known|posts/.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)",
  ],
};
