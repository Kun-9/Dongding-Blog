/**
 * PostViews — 조회수를 올리고 현재 숫자를 보여준다.
 *
 * 서버에서 읽으면 ISR 로 캐시된 글 HTML 에 숫자가 굳어버리므로 클라이언트에서만
 * 다룬다. 같은 탭에서 새로고침할 때마다 오르지 않도록 sessionStorage 로 한 번만
 * 센다(브라우저를 닫으면 다시 셈).
 *
 * Umami 는 그대로 두었다 — 이 숫자는 화면 표기용이고, 방문 분석은 그쪽에서 본다.
 */
"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase-browser";

const SEEN_KEY = "dongding:viewed";

function alreadyCounted(slug: string): boolean {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(slug)) return true;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, slug]));
    return false;
  } catch {
    // 프라이빗 모드 등 — 막히면 그냥 세고 만다.
    return false;
  }
}

export function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const db = browserClient();

    async function run() {
      if (!alreadyCounted(slug)) {
        await db.rpc("increment_view", { p_slug: slug });
      }
      const { data } = await db
        .from("post_stats")
        .select("views, posts!inner(slug)")
        .eq("posts.slug", slug)
        .maybeSingle();
      if (alive) setViews(data?.views ?? 0);
    }

    run().catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  if (views == null) return null;
  return (
    <span className="font-mono tabular-nums">
      {views.toLocaleString()} views
    </span>
  );
}
