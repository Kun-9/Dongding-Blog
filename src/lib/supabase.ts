/**
 * Supabase 서버 클라이언트.
 *
 * - `db()`   : publishable 키. RLS 가 걸려 있어 published 글만 읽힌다. 공개 페이지용.
 * - `dbAdmin()`: secret 키. RLS 를 우회하므로 draft/private 조회와 쓰기에만 쓴다.
 *
 * 둘 다 세션을 저장하지 않는다 — 요청마다 무상태로 붙었다 끊는다.
 */
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type BlogClient = SupabaseClient<Database>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다`);
  return value;
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };

let publicClient: BlogClient | null = null;
let adminClient: BlogClient | null = null;

export function db(): BlogClient {
  publicClient ??= createClient<Database>(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    options,
  );
  return publicClient;
}

export function dbAdmin(): BlogClient {
  adminClient ??= createClient<Database>(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SECRET_KEY"),
    options,
  );
  return adminClient;
}
