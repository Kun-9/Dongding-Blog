"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { API } from "@/lib/api-routes";
import type { CandidateStatus, QueueRow } from "@/lib/release-queue";

const TABS: { key: CandidateStatus; label: string }[] = [
  { key: "new", label: "새 글감" },
  { key: "queued", label: "쓸래" },
  { key: "written", label: "썼음" },
  { key: "skipped", label: "무시" },
];

/** 현재 상태에서 옮겨갈 수 있는 자리. 자기 자신은 뺀다. */
const MOVES: { key: CandidateStatus; label: string }[] = [
  { key: "queued", label: "쓸래" },
  { key: "written", label: "썼음" },
  { key: "skipped", label: "무시" },
  { key: "new", label: "되돌리기" },
];

interface Props {
  rows: QueueRow[];
  setRows: Dispatch<SetStateAction<QueueRow[]>>;
  /** 글감 id → 묶인 글 주제 제목. */
  topicsOf: Map<string, string[]>;
}

export function ReleaseQueue({ rows, setRows, topicsOf }: Props) {
  const [tab, setTab] = useState<CandidateStatus>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = rows.filter((r) => r.status === tab);
  const count = (s: CandidateStatus) =>
    rows.filter((r) => r.status === s).length;

  async function move(id: string, status: CandidateStatus) {
    setBusy(id);
    setError(null);
    // 낙관적 갱신 — 실패하면 아래에서 되돌린다.
    const before = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch(API.releases, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        setRows(before);
        setError(`상태 변경 실패 (${res.status})`);
      }
    } catch {
      setRows(before);
      setError("상태 변경 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mb-14">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 font-sans text-[13px] transition-colors ${
              tab === t.key
                ? "border-border-strong bg-surface font-semibold text-ink"
                : "border-border-token text-ink-muted"
            }`}
          >
            {t.label} {count(t.key)}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-ink-soft">{error}</p>
      )}

      {shown.length === 0 ? (
        <p className="py-8 text-[14px] text-ink-muted">여기는 비어 있습니다.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {shown.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border-token bg-surface p-[14px]"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-sans text-[13px] font-semibold text-ink">
                  {r.repo}
                </span>
                <span className="font-mono text-[12px] text-ink-soft">
                  {r.tag}
                </span>
                <span className="text-[12px] tabular-nums text-ink-muted">
                  {r.publishedAt.slice(0, 10)}
                </span>
              </div>
              {r.name && r.name !== r.tag && (
                <div className="mt-1 text-[13.5px] leading-[1.5] text-ink-soft">
                  {r.name}
                </div>
              )}
              {r.note && (
                <div className="mt-1 text-[13px] leading-[1.5] text-ink-muted">
                  {r.note}
                </div>
              )}
              {topicsOf.get(r.id) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {topicsOf.get(r.id)!.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-surface-alt px-1.5 py-0.5 font-sans text-[11.5px] text-ink-soft"
                    >
                      → {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border-token px-2.5 py-1 text-[12px] text-ink-muted no-underline"
                >
                  GitHub ↗
                </a>
                {MOVES.filter((m) => m.key !== r.status).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => move(r.id, m.key)}
                    className="rounded-full border border-border-token px-2.5 py-1 font-sans text-[12px] text-ink-soft transition-colors hover:border-border-strong disabled:opacity-40"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
