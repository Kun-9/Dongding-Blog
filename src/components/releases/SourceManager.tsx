"use client";

import { useState } from "react";
import { API } from "@/lib/api-routes";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SourceRow } from "@/lib/release-queue";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

interface Props {
  initial: SourceRow[];
  collectEnabled: boolean;
}

export function SourceManager({ initial, collectEnabled }: Props) {
  const [sources, setSources] = useState(initial);
  const [enabled, setEnabled] = useState(collectEnabled);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SourceRow | null>(null);
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "collecting" | { error: string }
  >("idle");

  function add() {
    const repo = draft.trim().replace(/^https?:\/\/github\.com\//, "");
    if (!REPO_RE.test(repo)) {
      setStatus({ error: "owner/name 형식으로 적어주세요" });
      return;
    }
    if (sources.some((s) => s.repo === repo)) {
      setStatus({ error: "이미 추적 중입니다" });
      return;
    }
    setSources((s) => [...s, { repo, enabled: true, count: 0 }]);
    setDraft("");
    setStatus("idle");
  }

  async function save(next = sources, nextEnabled = enabled) {
    setStatus("saving");
    try {
      const res = await fetch(API.releaseSources, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collectEnabled: nextEnabled,
          sources: next.map((s) => ({ repo: s.repo, enabled: s.enabled })),
        }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        setStatus({ error: msg.error ?? `저장 실패 (${res.status})` });
        return;
      }
      setStatus("saved");
    } catch {
      setStatus({ error: "저장 실패" });
    }
  }

  async function collectNow() {
    setStatus("collecting");
    try {
      const res = await fetch(API.releaseCollect, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ error: body.error ?? `수집 실패 (${res.status})` });
        return;
      }
      if (body.skipped) {
        setStatus({ error: body.skipped });
        return;
      }
      // 새 글감이 목록에 반영되려면 서버 컴포넌트를 다시 그려야 한다.
      window.location.reload();
    } catch {
      setStatus({ error: "수집 실패" });
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-border-token pb-3">
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          추적 레포
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={collectNow}
            disabled={status === "collecting"}
            className="rounded-full border border-border-token px-3 py-1.5 font-sans text-[13px] text-ink-soft transition-colors hover:border-border-strong disabled:opacity-40"
          >
            {status === "collecting" ? "수집 중…" : "지금 수집"}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !enabled;
              setEnabled(next);
              void save(sources, next);
            }}
            className="rounded-full border border-border-token px-3 py-1.5 font-sans text-[13px] text-ink-soft transition-colors hover:border-border-strong"
          >
            자동 수집 {enabled ? "켜짐" : "꺼짐"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="owner/name"
          className="min-w-0 flex-1 rounded-lg border border-border-token bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-border-strong"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg border border-border-token px-3 py-2 font-sans text-[13px] text-ink-soft transition-colors hover:border-border-strong"
        >
          추가
        </button>
      </div>

      <ul className="m-0 mb-4 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
        {sources.map((s) => (
          <li
            key={s.repo}
            className="flex items-center gap-2 rounded-lg border border-border-token bg-surface px-3 py-2"
          >
            <button
              type="button"
              onClick={() =>
                setSources((rs) =>
                  rs.map((r) =>
                    r.repo === s.repo ? { ...r, enabled: !r.enabled } : r,
                  ),
                )
              }
              className={`shrink-0 rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold ${
                s.enabled
                  ? "bg-ink text-[color:var(--bg)]"
                  : "border border-border-token text-ink-muted"
              }`}
            >
              {s.enabled ? "켜짐" : "꺼짐"}
            </button>
            <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-soft">
              {s.repo}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">
              {s.count}
            </span>
            <button
              type="button"
              onClick={() => setPendingDelete(s)}
              className="shrink-0 text-[13px] text-ink-muted"
              aria-label={`${s.repo} 삭제`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving"}
          className="rounded-full bg-ink px-4 py-2 font-sans text-[13px] font-semibold disabled:opacity-40"
          style={{ color: "var(--bg)" }}
        >
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
        {status === "saved" && (
          <span className="text-[13px] text-ink-muted">저장됨</span>
        )}
        {typeof status === "object" && (
          <span className="text-[13px] text-ink-soft">{status.error}</span>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={`${pendingDelete?.repo} 를 추적 목록에서 지울까요?`}
        body={
          pendingDelete && pendingDelete.count > 0
            ? `이 레포의 글감 ${pendingDelete.count}건도 같이 지워집니다. 잠시 멈추려는 것이라면 삭제 대신 꺼짐으로 두세요.`
            : "수집 대상에서 빠집니다."
        }
        confirmLabel="지우기"
        onConfirm={() => {
          const next = sources.filter((s) => s.repo !== pendingDelete?.repo);
          setSources(next);
          setPendingDelete(null);
          void save(next);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
