/**
 * RevisionPanel — Studio 에서 글의 수정 이력을 보고 되돌린다.
 *
 * 이력은 글을 저장할 때마다 DB 트리거가 "직전 상태"로 쌓는다. 되돌리기도 결국
 * 저장이라 그 순간의 상태가 다시 이력에 남는다 — 되돌린 걸 되돌릴 수 있다.
 *
 * 제목·본문·분류만 되돌리고 발행 상태와 주소(slug)는 건드리지 않는다.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { API } from "@/lib/api-routes";

interface Revision {
  id: number;
  title: string;
  visibility: string | null;
  createdAt: string;
  chars: number;
  preview: string;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  slug: string;
  /** 복원 후 편집기를 새 내용으로 다시 채우기 위해 부모에게 알린다. */
  onRestored: () => void;
}

export function RevisionPanel({ slug, onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Revision[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 상태 갱신은 전부 await 뒤에서 한다 — effect 안에서 동기로 setState 하면
  // 렌더가 한 번 더 돈다.
  const load = useCallback(async () => {
    try {
      const res = await fetch(API.postRevisions(slug));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as Revision[];
      setError(null);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [slug]);

  useEffect(() => {
    // load 는 await 뒤에서만 상태를 바꾸지만, 규칙이 호출 자체를 잡는다.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (open) void load();
  }, [open, load]);

  async function restore(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(API.postRevisions(slug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onRestored();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer rounded-md border border-border-token bg-transparent px-3 py-[6px] font-sans text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-hover hover:text-ink"
        title="이 글의 수정 이력"
      >
        이력
      </button>

      {open && (
        <div className="fixed right-5 top-[104px] z-30 max-h-[70vh] w-[min(420px,calc(100vw-40px))] overflow-auto rounded-lg border border-border-token bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              수정 이력
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer border-0 bg-transparent text-[12px] text-ink-muted"
            >
              닫기
            </button>
          </div>

          {error && (
            <p className="m-0 mb-2 text-[12px] text-[#c0563f]">{error}</p>
          )}

          {items === null && (
            <p className="m-0 text-[12.5px] text-ink-muted">불러오는 중…</p>
          )}

          {items?.length === 0 && (
            <p className="m-0 text-[12.5px] leading-[1.6] text-ink-muted">
              아직 이력이 없습니다. 이 글을 한 번 더 저장하면 직전 내용이 여기
              쌓입니다.
            </p>
          )}

          {items?.map((r) => (
            <div
              key={r.id}
              className="border-t border-border-token py-2.5 first:border-t-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11.5px] tabular-nums text-ink-muted">
                  {fmt(r.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => void restore(r.id)}
                  disabled={busyId !== null}
                  className="cursor-pointer rounded border border-border-token bg-transparent px-2 py-1 font-sans text-[11.5px] text-ink-soft hover:text-ink disabled:cursor-wait disabled:opacity-50"
                >
                  {busyId === r.id ? "복원 중…" : "이 버전으로"}
                </button>
              </div>
              <div className="mt-1 font-sans text-[13px] font-medium text-ink">
                {r.title}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[12px] leading-[1.5] text-ink-muted">
                {r.preview || "(본문 없음)"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-ink-subtle">
                {r.chars.toLocaleString()}자
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
