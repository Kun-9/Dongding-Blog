/**
 * 브라우저용 Supabase 클라이언트 — 세션 쿠키를 읽어 로그인 여부를 판단한다.
 *
 * 여기서 나온 판단은 UI 를 보여줄지 말지에만 쓴다. 실제 권한 검사는 서버가
 * 하며(`lib/auth`), 편집 API 는 세션이 없으면 401 을 돌려준다.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function browserClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
