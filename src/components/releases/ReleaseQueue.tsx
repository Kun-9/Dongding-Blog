"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { API } from "@/lib/api-routes";
import { Collapse } from "@/components/releases/Collapse";
import type { CandidateStatus, QueueRow } from "@/lib/release-queue";

const TABS: { key: CandidateStatus; label: string }[] = [
  { key: "new", label: "새 글감" },
  { key: "queued", label: "쓸래" },
  { key: "written", label: "썼음" },
  { key: "skipped", label: "무시" },
];

/**
 * 행에서 바로 옮길 자리. "썼음"은 뺀다 — 주제를 발행하면 묶인 글감이 알아서
 * 닫히므로 손으로 누를 일이 거의 없고, 버튼 하나가 줄면 행이 짧아진다.
 */
const MOVES: Record<CandidateStatus, { key: CandidateStatus; label: string }[]> = {
  new: [
    { key: "queued", label: "쓸래" },
    { key: "skipped", label: "무시" },
  ],
  queued: [
    { key: "skipped", label: "무시" },
    { key: "new", label: "되돌리기" },
  ],
  written: [{ key: "new", label: "되돌리기" }],
  skipped: [{ key: "new", label: "되돌리기" }],
};

/** 이보다 많으면 레포 묶음을 접은 채로 연다. 73건을 다 펼치면 스크롤만 길다. */
const OPEN_LIMIT = 15;

interface Props {
  rows: QueueRow[];
  setRows: Dispatch<SetStateAction<QueueRow[]>>;
  /** 글감 id → 묶인 글 주제 제목. */
  topicsOf: Map<string, string[]>;
}

interface Group {
  repo: string;
  rows: QueueRow[];
}

export function ReleaseQueue({ rows, setRows, topicsOf }: Props) {
  const [tab, setTab] = useState<CandidateStatus>("new");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  /** 탭별로 사람이 직접 펼치고 접은 레포. 없으면 기본값(OPEN_LIMIT)을 따른다. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const shown = rows.filter((r) => r.status === tab);
  const count = (s: CandidateStatus) => rows.filter((r) => r.status === s).length;

  // 레포별로 묶는다. 최근 릴리스가 있는 레포가 위로 (rows 는 이미 최신순).
  const groups = useMemo(() => {
    const m = new Map<string, QueueRow[]>();
    for (const r of shown) m.set(r.repo, [...(m.get(r.repo) ?? []), r]);
    return [...m].map(([repo, rs]): Group => ({ repo, rows: rs }));
  }, [shown]);

  const defaultOpen = shown.length <= OPEN_LIMIT;
  const isOpen = (repo: string) => toggled[`${tab}:${repo}`] ?? defaultOpen;
  const allOpen = groups.every((g) => isOpen(g.repo));

  function toggle(repo: string) {
    setToggled((t) => ({ ...t, [`${tab}:${repo}`]: !isOpen(repo) }));
  }

  function toggleAll() {
    const next = !allOpen;
    setToggled((t) => {
      const n = { ...t };
      for (const g of groups) n[`${tab}:${g.repo}`] = next;
      return n;
    });
  }

  /** 여러 건을 한 번에 옮긴다. 낙관적으로 바꾸고, 실패한 것만 되돌린다. */
  async function move(ids: string[], status: CandidateStatus) {
    setError(null);
    const before = new Map(rows.filter((r) => ids.includes(r.id)).map((r) => [r.id, r.status]));
    setBusy((b) => new Set([...b, ...ids]));
    setRows((rs) => rs.map((r) => (before.has(r.id) ? { ...r, status } : r)));

    const results = await Promise.all(
      ids.map((id) =>
        fetch(API.releases, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, status }),
        })
          .then((res) => res.ok)
          .catch(() => false),
      ),
    );

    const failed = ids.filter((_, i) => !results[i]);
    if (failed.length) {
      setRows((rs) =>
        rs.map((r) => (failed.includes(r.id) ? { ...r, status: before.get(r.id)! } : r)),
      );
      setError(`${failed.length}건 상태 변경 실패`);
    }
    setBusy((b) => {
      const n = new Set(b);
      for (const id of ids) n.delete(id);
      return n;
    });
  }

  return (
    <section className="mb-14">
      <div className="mb-4">
        <div className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Inbox
        </div>
        <h2 className="m-0 font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
          글감 검토
        </h2>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-[13px] transition-colors ${
              tab === t.key
                ? "border-ink bg-ink font-semibold text-bg"
                : "border-border-token bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className="font-mono text-[11.5px] tabular-nums opacity-70">{count(t.key)}</span>
          </button>
        ))}
        {groups.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="ml-auto font-sans text-[12.5px] text-ink-muted transition-colors hover:text-ink"
          >
            {allOpen ? "모두 접기" : "모두 펼치기"}
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}

      {shown.length === 0 ? (
        <p className="topic-rise rounded-xl border border-dashed border-border-token py-10 text-center text-[14px] text-ink-muted">
          여기는 비어 있습니다.
        </p>
      ) : (
        <div
          key={tab}
          className="topic-rise overflow-hidden rounded-xl border border-border-token bg-surface"
        >
          {groups.map((g, gi) => {
            const open = isOpen(g.repo);
            const [owner, name] = g.repo.split("/");
            return (
              <div key={g.repo} className={gi > 0 ? "border-t border-border-token" : ""}>
                {/* 레포 머리 — 누르면 접고 편다. 새 글감 탭에선 레포째 무시할 수 있다. */}
                <div className="flex items-center gap-2 pr-3 sm:pr-4">
                  <button
                    type="button"
                    onClick={() => toggle(g.repo)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3 text-left transition-colors hover:bg-hover sm:pl-4"
                  >
                    <span
                      aria-hidden
                      className={`text-[9px] text-ink-subtle transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                    >
                      ▶
                    </span>
                    <span className="min-w-0 truncate font-sans text-[13.5px]">
                      <span className="text-ink-muted">{owner}/</span>
                      <span className="font-semibold text-ink">{name}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-alt px-1.5 font-mono text-[11px] tabular-nums text-ink-muted">
                      {g.rows.length}
                    </span>
                    <span className="ml-auto hidden shrink-0 font-mono text-[11.5px] tabular-nums text-ink-subtle sm:inline">
                      {g.rows[0].publishedAt.slice(5, 10).replace("-", ".")}
                    </span>
                  </button>
                  {tab === "new" && (
                    <button
                      type="button"
                      onClick={() => move(g.rows.map((r) => r.id), "skipped")}
                      className="shrink-0 rounded-full px-2 py-1 font-sans text-[12px] text-ink-muted transition-colors hover:bg-hover hover:text-ink"
                      title={`${g.repo} 글감 ${g.rows.length}건을 모두 무시`}
                    >
                      모두 무시
                    </button>
                  )}
                </div>

                <Collapse open={open}>
                  <ul className="m-0 list-none border-t border-border-token bg-bg/40 p-0">
                    {g.rows.map((r) => (
                      <Row
                        key={r.id}
                        row={r}
                        topics={topicsOf.get(r.id)}
                        busy={busy.has(r.id)}
                        onMove={(s) => move([r.id], s)}
                      />
                    ))}
                  </ul>
                </Collapse>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** 글감 한 줄. 태그가 곧 GitHub 링크라 따로 버튼을 두지 않는다. */
function Row({
  row: r,
  topics,
  busy,
  onMove,
}: {
  row: QueueRow;
  topics?: string[];
  busy: boolean;
  onMove: (s: CandidateStatus) => void;
}) {
  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-token py-2 pl-9 pr-3 last:border-b-0 sm:flex-nowrap sm:pl-10 sm:pr-4">
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        title={r.name && r.name !== r.tag ? r.name : "GitHub 에서 보기"}
        className="shrink-0 font-mono text-[12.5px] text-ink no-underline underline-offset-4 hover:underline"
      >
        {r.tag}
      </a>

      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {topics?.map((t) => (
          <span
            key={t}
            className="max-w-[180px] shrink-0 truncate rounded-md bg-surface-alt px-1.5 py-0.5 font-sans text-[11px] text-ink-soft"
          >
            → {t}
          </span>
        ))}
        {r.note && (
          <span className="min-w-0 truncate text-[12.5px] text-ink-muted" title={r.note}>
            {r.note}
          </span>
        )}
      </span>

      <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-ink-subtle">
        {r.publishedAt.slice(5, 10).replace("-", ".")}
      </span>

      {/* 데스크톱에선 마우스를 올렸을 때만 보인다. 터치 기기는 늘 보인다. */}
      <span className="touch-always flex shrink-0 gap-1 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {MOVES[r.status].map((m) => (
          <button
            key={m.key}
            type="button"
            disabled={busy}
            onClick={() => onMove(m.key)}
            className={`rounded-full px-2.5 py-0.5 font-sans text-[12px] transition-[background-color,color,transform] active:scale-[0.95] disabled:opacity-40 ${
              m.key === "queued"
                ? "bg-ink text-bg hover:opacity-90"
                : "text-ink-muted hover:bg-hover hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </span>
    </li>
  );
}
