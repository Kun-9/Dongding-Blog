/**
 * LikeButton — 글 하단의 좋아요.
 *
 * 익명이라 서버는 "누가 눌렀는지"를 모른다. 누른 사실은 브라우저가 기억하고
 * 서버는 증감만 받는다(toggle_like 는 +1 / -1 만 허용). 다른 기기에서 다시
 * 누르면 또 올라가는데, 개인 블로그의 좋아요에는 그 정도면 충분하다.
 */
"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { safeReadJSON, safeWriteJSON } from "@/lib/storage";

const LIKED_KEY = "dongding:liked";

function readLiked(): string[] {
  const v = safeReadJSON<string[]>(LIKED_KEY, (x): x is string[] =>
    Array.isArray(x),
  );
  return v ?? [];
}

export function LikeButton({ slug }: { slug: string }) {
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    // 좋아요 눌렀는지(localStorage)와 개수(DB)를 함께 반영한다.
    // effect 안에서 동기로 setState 하면 렌더가 한 번 더 도므로 콜백에서 처리.
    browserClient()
      .from("post_stats")
      .select("likes, posts!inner(slug)")
      .eq("posts.slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setLikes(data?.likes ?? 0);
        setLiked(readLiked().includes(slug));
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  async function toggle() {
    if (busy || likes == null) return;
    setBusy(true);

    const delta = liked ? -1 : 1;
    // 낙관적 갱신 — 실패하면 아래에서 되돌린다.
    setLiked(!liked);
    setLikes(Math.max(likes + delta, 0));

    const { data, error } = await browserClient().rpc("toggle_like", {
      p_slug: slug,
      p_delta: delta,
    });

    if (error) {
      setLiked(liked);
      setLikes(likes);
    } else {
      if (typeof data === "number") setLikes(data);
      const next = liked
        ? readLiked().filter((s) => s !== slug)
        : [...readLiked(), slug];
      safeWriteJSON(LIKED_KEY, next);
    }
    setBusy(false);
  }

  if (likes == null) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 font-sans text-[13px] font-medium transition-colors disabled:cursor-wait ${
        liked
          ? "border-border-strong bg-hover text-ink"
          : "border-border-token bg-surface text-ink-muted hover:text-ink"
      }`}
    >
      <span>{liked ? "좋아요 취소" : "좋아요"}</span>
      <span className="tabular-nums">{likes.toLocaleString()}</span>
    </button>
  );
}
