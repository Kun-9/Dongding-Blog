/**
 * 인증 — Supabase Auth 세션을 쿠키로 주고받는다.
 *
 * 데이터 접근 계층(DAL) 역할도 겸한다. 프록시(`proxy.ts`)의 검사는 쿠키만 보는
 * 낙관적 판단이라 신뢰할 수 없으므로, 실제 차단은 여기 `requireUser` /
 * `requireApiUser` 가 데이터에 손대기 직전에 한다.
 *
 * `getUser()` 는 Supabase 서버에 토큰을 검증시키므로 `getSession()` 과 달리
 * 위조된 쿠키를 걸러낸다 — 인가 판단에는 반드시 이쪽을 쓸 것.
 */
import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다`);
  return value;
}

/** 요청 쿠키에 묶인 클라이언트. 로그인/로그아웃과 세션 조회에 쓴다. */
export async function authClient() {
  const store = await cookies();
  return createServerClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              store.set(name, value, options);
            }
          } catch {
            // 서버 컴포넌트에서는 쿠키를 못 쓴다 — 갱신은 proxy 가 담당한다.
          }
        },
      },
    },
  );
}

/** 로그인한 사용자 또는 null. 한 요청 안에서는 한 번만 검증한다. */
export const currentUser = cache(async (): Promise<User | null> => {
  const { data } = await (await authClient()).auth.getUser();
  return data.user ?? null;
});

/** 페이지용 — 로그인하지 않았으면 /login 으로 보낸다. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** 라우트 핸들러용 — 로그인하지 않았으면 401 을 돌려준다. */
export async function requireApiUser(): Promise<NextResponse | null> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  return null;
}
