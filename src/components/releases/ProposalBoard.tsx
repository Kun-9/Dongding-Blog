"use client";

import { useRef, useState, type ReactNode } from "react";
import { API } from "@/lib/api-routes";
import { renderMarkdown } from "@/lib/markdown";
import { SCOUTS, type ScoutKey } from "@/lib/release-scouts";
import type { TopicRow } from "@/lib/release-topics";
import { monthDay } from "@/components/releases/TopicBoard";

/** 버린 제안에 남는 이유. 탐색기가 같은 것을 다시 올리지 않는 근거가 된다. */
const DISCARD_REASON = "제안에서 버림";

/** 한 페이지 카드 수. 데스크톱 3열로 세 줄. */
const PAGE_SIZE = 9;

/**
 * 제안 — 탐색기(릴리스·트렌드·도구·인기 스킬·개념)가 올린 주제를 같은 틀의 카드로
 * 보여 준다. 무엇인가(요약), 왜 지금인가(angle), 근거 칩, 출처 확인 여부. 채택하면
 * 집필 진행판의 맡기기 전으로 내려가고, 버리면 버린 주제로 남는다.
 */
export function ProposalBoard({
  topics,
  onChange,
  onSkipped,
  onOpenBoard,
}: {
  topics: TopicRow[];
  onChange: (topic: TopicRow) => void;
  /** 버린 제안에 혼자 묶였던 쓸래 글감은 서버가 무시로 옮긴다. 목록도 맞춘다. */
  onSkipped: (ids: string[], note: string) => void;
  /** 채택한 주제를 맡기러 집필 진행 탭으로. */
  onOpenBoard: () => void;
}) {
  const [filter, setFilter] = useState<ScoutKey | "all">("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesOf, setNotesOf] = useState<number | null>(null);
  const [adopted, setAdopted] = useState<string | null>(null);
  const top = useRef<HTMLElement>(null);

  const scoutOf = (t: TopicRow): ScoutKey => t.proposal?.scout ?? (t.kind === "concept" ? "concept" : "release");
  const proposals = topics
    .filter((t) => t.proposed && !t.discardedAt && t.droppedReason === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const counts = SCOUTS.map((s) => ({ ...s, n: proposals.filter((t) => scoutOf(t) === s.key).length })).filter((s) => s.n > 0);
  // 고른 칸이 비면(마지막 하나를 채택하면) 전체로 돌아간다.
  const current = counts.some((s) => s.key === filter) ? filter : "all";
  const shown = current === "all" ? proposals : proposals.filter((t) => scoutOf(t) === current);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  // 마지막 페이지의 마지막 카드를 채택·버리면 앞 페이지로 당긴다.
  const at = Math.min(page, pages - 1);
  const paged = shown.slice(at * PAGE_SIZE, (at + 1) * PAGE_SIZE);

  function goPage(n: number) {
    setPage(n);
    setNotesOf(null);
    top.current?.scrollIntoView({ block: "start" });
  }

  async function act(t: TopicRow, action: "adopt" | "discard") {
    setBusy(t.id);
    setError(null);
    const res = await fetch(API.releaseTopics, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "adopt" ? { action, id: t.id } : { action, id: t.id, reason: DISCARD_REASON }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { topic?: TopicRow; skipped?: string[]; error?: string } | null;
    setBusy(null);
    if (!res?.ok || !json?.topic) {
      setError(json?.error ?? "처리하지 못했습니다. 다시 눌러 주세요");
      return;
    }
    onChange(json.topic);
    setAdopted(action === "adopt" ? t.title : null);
    if (json.skipped?.length) onSkipped(json.skipped, `버린 주제 '${t.title}': ${DISCARD_REASON}`);
  }

  // 이름은 위 탭(제안 N)이 대신한다.
  return (
    <section ref={top} aria-label="제안" className="mb-14">
      {adopted && (
        <div
          role="status"
          className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[10px] bg-[color:var(--callout-tip-bg)] px-3.5 py-2 text-[13px] text-[color:var(--callout-tip-ink)]"
        >
          <span>
            <b className="font-semibold">{adopted}</b> 채택함. 맡기기 전으로 옮겼습니다.
          </span>
          <button
            type="button"
            onClick={() => {
              setAdopted(null);
              onOpenBoard();
            }}
            className="ml-auto font-semibold underline underline-offset-2"
          >
            집필 진행에서 맡기기
          </button>
        </div>
      )}
      <p className="m-0 mb-3.5 text-[13px] text-ink-muted">
        탐색기가 올린 글감입니다. 채택하면 집필 진행의 맡기기 전으로 내려갑니다.
      </p>

      {proposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-token px-6 py-8 text-center">
          <p className="m-0 text-[14px] text-ink-muted">
            새 제안이 없습니다. 탐색기는 매일 아침, 인기 스킬은 월요일에 올립니다.
          </p>
        </div>
      ) : (
        <>
          {counts.length > 1 && (
            <div className="mb-3.5 flex flex-wrap gap-1.5" role="group" aria-label="탐색기">
              {[{ key: "all" as const, label: "전체", n: proposals.length }, ...counts].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={current === s.key}
                  onClick={() => {
                    setFilter(s.key);
                    setPage(0);
                  }}
                  className={`rounded-full border px-3 py-1 font-sans text-[12.5px] transition-colors ${
                    current === s.key
                      ? "border-ink bg-surface text-ink"
                      : "border-border-token text-ink-muted hover:text-ink"
                  }`}
                >
                  {s.label} <span className="font-mono text-[11.5px] tabular-nums">{s.n}</span>
                </button>
              ))}
            </div>
          )}
          {error && <p className="m-0 mb-3 text-[13px] text-danger">{error}</p>}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {paged.map((t) => (
              <ProposalCard
                key={t.id}
                topic={t}
                scout={SCOUTS.find((s) => s.key === scoutOf(t))!.label}
                busy={busy === t.id}
                notesOpen={notesOf === t.id}
                onNotes={() => setNotesOf(notesOf === t.id ? null : t.id)}
                onAdopt={() => act(t, "adopt")}
                onDiscard={() => act(t, "discard")}
              />
            ))}
          </div>
          {pages > 1 && <Pager at={at} pages={pages} onGo={goPage} />}
        </>
      )}
    </section>
  );
}

function ProposalCard({
  topic: t,
  scout,
  busy,
  notesOpen,
  onNotes,
  onAdopt,
  onDiscard,
}: {
  topic: TopicRow;
  scout: string;
  busy: boolean;
  notesOpen: boolean;
  onNotes: () => void;
  onAdopt: () => void;
  onDiscard: () => void;
}) {
  const p = t.proposal;
  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-xl border border-border-token bg-surface px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip className="bg-[color:var(--callout-info-bg)] text-[color:var(--callout-info-ink)]">{scout}</Chip>
        {p &&
          (p.unverified ? (
            <Chip wrap className="bg-[color:var(--callout-warning-bg)] text-[color:var(--callout-warning-ink)]">
              {p.unverified}
            </Chip>
          ) : (
            <Chip className="bg-[color:var(--callout-tip-bg)] text-[color:var(--callout-tip-ink)]">출처 확인</Chip>
          ))}
        <span className="ml-auto font-mono text-[12px] tabular-nums text-ink-subtle">{monthDay(t.createdAt)}</span>
      </div>
      <h3 className="m-0 font-sans text-[15.5px] font-semibold leading-[1.4] tracking-[-0.01em] text-ink [text-wrap:balance]">
        {t.title}
      </h3>
      {p?.summary && <p className="m-0 text-[13.5px] leading-[1.55] text-ink-soft">{p.summary}</p>}
      {t.angle && (
        <p className="m-0 text-[13px] leading-[1.55] text-ink-muted">
          <b className="mr-1 font-semibold text-ink">왜 지금</b>
          {t.angle}
        </p>
      )}
      {p && p.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.signals.map((s) => (
            <Chip key={s} className="bg-surface-alt font-mono text-[11.5px] text-ink-soft">
              {s}
            </Chip>
          ))}
        </div>
      )}
      {p?.trend && <Trend weeks={p.trend} />}
      {/* 한 줄의 카드는 높이가 같다. 버튼을 바닥에 붙여 줄마다 같은 자리에 둔다. */}
      <div className="mt-auto flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onAdopt}
          disabled={busy}
          className="rounded-full bg-ink px-3 py-1 font-sans text-[12.5px] font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          채택
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={busy}
          className="rounded-full border border-border-token px-3 py-1 font-sans text-[12.5px] text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          버림
        </button>
        {t.notes && (
          <button
            type="button"
            onClick={onNotes}
            aria-expanded={notesOpen}
            className="ml-auto font-sans text-[12.5px] text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            {notesOpen ? "노트 접기" : "노트"}
          </button>
        )}
      </div>
      {notesOpen && (
        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border-token bg-bg px-3.5 py-2.5 text-[13px] [&_h2]:mt-3 [&_h2]:text-[14px] [&_h3]:text-[13.5px]">
          {renderMarkdown(t.notes)}
        </div>
      )}
    </article>
  );
}

/** 이전 · 페이지 번호 · 다음. 제안은 많아야 수십 개라 번호를 다 보인다. */
function Pager({ at, pages, onGo }: { at: number; pages: number; onGo: (n: number) => void }) {
  const base = "rounded-full px-3 py-1 font-sans text-[12.5px] transition-colors disabled:opacity-40";
  return (
    <nav aria-label="제안 페이지" className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onGo(at - 1)}
        disabled={at === 0}
        className={`${base} border border-border-token text-ink-muted enabled:hover:text-ink`}
      >
        이전
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onGo(i)}
          aria-current={i === at ? "page" : undefined}
          className={`${base} min-w-8 font-mono tabular-nums ${
            i === at ? "bg-ink text-bg" : "text-ink-muted hover:text-ink"
          }`}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onGo(at + 1)}
        disabled={at === pages - 1}
        className={`${base} border border-border-token text-ink-muted enabled:hover:text-ink`}
      >
        다음
      </button>
    </nav>
  );
}

/** wrap: 미확인 문장처럼 길 수 있는 칩은 카드 폭에서 줄을 바꾼다. */
function Chip({ className, wrap = false, children }: { className: string; wrap?: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 font-sans text-[12px] font-medium ${wrap ? "" : "whitespace-nowrap"} ${className}`}
    >
      {children}
    </span>
  );
}

/** 인기 스킬의 8주 주별 설치. 마지막 주만 진하게. */
function Trend({ weeks }: { weeks: number[] }) {
  const w = 120;
  const h = 28;
  const bw = w / weeks.length;
  const max = Math.max(1, ...weeks);
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`8주 설치 ${weeks.map(k).join("→")}`}>
      {weeks.map((v, i) => {
        const bh = Math.max(2, (v / max) * (h - 2));
        return (
          <rect
            key={i}
            x={i * bw + 1}
            y={h - bh}
            width={bw - 2}
            height={bh}
            rx={1.5}
            fill={i === weeks.length - 1 ? "var(--ink)" : "var(--ink-subtle)"}
          />
        );
      })}
    </svg>
  );
}
