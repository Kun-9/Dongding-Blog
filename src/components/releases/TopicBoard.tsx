"use client";

import { useState, type ReactNode } from "react";
import { API } from "@/lib/api-routes";
import { Collapse } from "@/components/releases/Collapse";
import { useMounted } from "@/lib/hooks";
import { renderMarkdown } from "@/lib/markdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { QueueRow } from "@/lib/release-queue";
import type { AiUntil, TopicRow } from "@/lib/release-topics";
import {
  STAGES,
  nextStage,
  stageIndex,
  stageLabel,
  type StageKey,
} from "@/lib/release-stages";
import { AVOID, OUTLINE, REQUIRED_PARTS, VOICE_RULES } from "@/lib/voice";

/** 단계마다 근거 칸에 무엇을 적을지. */
const NOTE_HINT: Partial<Record<StageKey, string>> = {
  sources: "읽은 문서·PR·이슈 링크, 직접 실행해 본 결과, 릴리스 노트에 없던 맥락",
  assets: "만든 자료 목록. 예: 버전별 동작 비교 표, 설정 화면 스크린샷 2장, 흐름 그림 1개",
  draft: "초안에서 잡은 구성, 남은 빈칸",
  review: "점검하면서 고친 것. 문체·구성 검사는 서버가 본문으로 직접 돌립니다",
  published: "발행 메모",
};

/**
 * 단계 색 — 새 색을 만들지 않고 콜아웃 팔레트를 빌린다. 다크 모드 대응이
 * 이미 되어 있고, 본문 콜아웃과 같은 온도라 화면이 따로 놀지 않는다.
 */
const TONE: Record<StageKey, "note" | "info" | "tip" | "warning"> = {
  picked: "note",
  sources: "info",
  assets: "tip",
  draft: "warning",
  review: "note",
  published: "note",
};

function tone(key: StageKey | "done") {
  if (key === "done") {
    return { fg: "var(--ink)", bg: "var(--surface-alt)", ink: "var(--ink)" };
  }
  const t = TONE[key];
  return {
    fg: `var(--callout-${t}-glyph)`,
    bg: `var(--callout-${t}-bg)`,
    ink: `var(--callout-${t}-ink)`,
  };
}

/** 진행판 칸 — 각 주제가 지금 붙잡고 있는 단계. 발행까지 끝나면 done. */
type Lane = StageKey | "done";

function laneOf(t: TopicRow): Lane {
  return nextStage(t.stage)?.key ?? "done";
}

const LANES: { key: Lane; label: string; no: string }[] = [
  // 번호는 카드의 진행바와 맞춘다 — 1단계(글감 묶음)는 만들 때 끝난다.
  ...STAGES.slice(1).map((s, i) => ({
    key: s.key as Lane,
    label: s.label,
    no: String(i + 2).padStart(2, "0"),
  })),
  { key: "done", label: "발행됨", no: "✓" },
];

const field =
  "w-full rounded-lg border border-border-token bg-surface px-3 py-2 text-[13.5px] leading-[1.55] text-ink placeholder:text-ink-subtle transition-colors focus:border-border-strong focus:outline-none";

interface Props {
  topics: TopicRow[];
  onTopicsChange: (next: TopicRow[]) => void;
  /** 주제에 묶을 수 있는 글감. 버린 것은 뺀다. */
  candidates: QueueRow[];
  /** 주제에 들어간 글감은 서버가 new → queued 로 올린다. 목록도 맞춘다. */
  onQueued: (ids: string[]) => void;
}

export function TopicBoard({ topics, onTopicsChange, candidates, onQueued }: Props) {
  const [lane, setLane] = useState<Lane | null>(null);
  const [creating, setCreating] = useState(false);
  const [showDropped, setShowDropped] = useState(false);

  const active = topics.filter((t) => t.droppedReason === null);
  const dropped = topics.filter((t) => t.droppedReason !== null);
  const shown = lane ? active.filter((t) => laneOf(t) === lane) : active;

  // 진행이 덜 된 주제가 위로. 같은 단계면 먼저 만든 순.
  const sorted = [...shown].sort(
    (a, b) => stageIndex(a.stage) - stageIndex(b.stage) || a.id - b.id,
  );

  function replace(topic: TopicRow) {
    onTopicsChange(
      topics.some((t) => t.id === topic.id)
        ? topics.map((t) => (t.id === topic.id ? topic : t))
        : [...topics, topic],
    );
    onQueued(topic.candidates.map((c) => c.id));
  }

  const remove = (id: number) => onTopicsChange(topics.filter((x) => x.id !== id));

  return (
    <section className="mb-14">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Pipeline
          </div>
          <h2 className="m-0 font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
            집필 진행
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className={`rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${
            creating
              ? "border border-border-token bg-surface text-ink-muted hover:text-ink"
              : "bg-ink text-bg hover:opacity-90"
          }`}
        >
          {creating ? "닫기" : "+ 새 주제"}
        </button>
      </div>

      <Overview active={active} lane={lane} onLane={setLane} />
      <GuideCard />

      <Collapse open={creating}>
        <div className="mb-3 rounded-xl border border-border-strong bg-surface p-5">
          <div className="mb-3 font-sans text-[13px] font-semibold text-ink">새 주제</div>
          <TopicEditor
            candidates={candidates}
            submitLabel="주제 만들기"
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const res = await call("POST", input);
              if ("topic" in res) {
                replace(res.topic);
                setCreating(false);
              }
              return res;
            }}
          />
        </div>
      </Collapse>

      {sorted.length === 0 ? (
        <div className="topic-rise rounded-xl border border-dashed border-border-token px-6 py-10 text-center">
          <p className="m-0 text-[14px] text-ink-muted">
            {lane
              ? "이 단계에 머문 주제가 없습니다."
              : "아직 주제가 없습니다. 쓸래로 고른 글감을 주제로 묶어보세요."}
          </p>
          {lane && (
            <button
              type="button"
              onClick={() => setLane(null)}
              className="mt-2 font-sans text-[13px] text-ink-soft underline-offset-4 hover:underline"
            >
              전체 보기
            </button>
          )}
        </div>
      ) : (
        <ul
          key={lane ?? "all"}
          className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2"
        >
          {sorted.map((t, i) => (
            <TopicCard
              key={t.id}
              index={i}
              topic={t}
              candidates={candidates}
              onChange={replace}
              onDelete={() => remove(t.id)}
            />
          ))}
        </ul>
      )}

      {dropped.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowDropped((v) => !v)}
            className="flex items-center gap-1.5 font-sans text-[13px] text-ink-muted transition-colors hover:text-ink"
          >
            <span
              className={`inline-block text-[10px] transition-transform ${showDropped ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            접은 주제 {dropped.length}
          </button>
          {showDropped && (
            <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
              {dropped.map((t, i) => (
                <TopicCard
                  key={t.id}
                  index={i}
                  topic={t}
                  candidates={candidates}
                  onChange={replace}
                  onDelete={() => remove(t.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

type CallResult = { topic: TopicRow } | { ok: true } | { error: string };

async function call(
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
): Promise<CallResult> {
  try {
    const res = await fetch(API.releaseTopics, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json.error ?? `실패 (${res.status})` };
    return json;
  } catch {
    return { error: "요청 실패" };
  }
}

/* ── 진행판 ──────────────────────────────────────────────────────────── */

function Overview({
  active,
  lane,
  onLane,
}: {
  active: TopicRow[];
  lane: Lane | null;
  onLane: (l: Lane | null) => void;
}) {
  const counts = LANES.map((l) => active.filter((t) => laneOf(t) === l.key).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const mounted = useMounted();

  return (
    <div className="topic-rise mb-5 overflow-hidden rounded-xl border border-border-token bg-surface">
      <ol className="m-0 grid list-none grid-cols-3 gap-px bg-border-token p-0 sm:grid-cols-6">
        {LANES.map((l, i) => {
          const n = counts[i];
          const on = lane === l.key;
          const c = tone(l.key);
          return (
            <li key={l.key} className="min-w-0 bg-surface">
              <button
                type="button"
                onClick={() => onLane(on ? null : l.key)}
                aria-pressed={on}
                className={`relative flex w-full flex-col items-start px-2.5 pb-3.5 pt-3 text-left transition-colors sm:px-4 ${
                  on ? "bg-hover" : "hover:bg-hover"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                      className="size-1.5 rounded-full transition-colors duration-300"
                    style={{ background: n > 0 ? c.fg : "var(--border)" }}
                  />
                  <span className="font-mono text-[10.5px] text-ink-subtle">{l.no}</span>
                </span>
                <span className="mt-1.5 w-full truncate font-sans text-[12px] font-medium text-ink-soft sm:text-[13px]">
                  {l.label}
                </span>
                <span
                  className={`mt-1 font-sans text-[24px] font-bold leading-none tabular-nums tracking-[-0.03em] sm:text-[28px] ${
                    n > 0 ? "text-ink" : "text-ink-subtle"
                  }`}
                >
                  {n}
                </span>
                <span
                  aria-hidden
                  className={`absolute inset-x-0 bottom-0 h-[2px] origin-left transition-transform duration-300 ease-out ${
                    on ? "scale-x-100" : "scale-x-0"
                  }`}
                  style={{ background: c.fg }}
                />
              </button>
            </li>
          );
        })}
      </ol>

      {/* 분포 막대 — 주제가 어느 단계에 몰려 있는지 한눈에. */}
      <div className="flex h-1 w-full bg-surface-alt">
        {LANES.map((l, i) => (
          <span
            key={l.key}
            className="h-full transition-[width] duration-700 ease-out"
            style={{
              width: mounted && total > 0 ? `${(counts[i] / total) * 100}%` : "0%",
              background: tone(l.key).fg,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── 글쓰기 기준 ─────────────────────────────────────────────────────── */

/** 점검(review) 단계가 검사하는 기준 그대로. 접혀 있어도 핵심은 한 줄로 보인다. */
function GuideCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="topic-rise mb-5 rounded-xl border border-border-token bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left sm:px-5"
      >
        <span className="font-sans text-[13px] font-semibold text-ink">글쓰기 기준</span>
        <span className="rounded-full bg-ink px-2 py-0.5 font-sans text-[11px] font-semibold text-bg">
          합니다체
        </span>
        <span className="flex flex-wrap gap-1">
          {REQUIRED_PARTS.map((p) => (
            <span
              key={p.key}
              className="rounded-full border border-border-token px-2 py-0.5 font-sans text-[11px] text-ink-muted"
            >
              {p.label}
            </span>
          ))}
        </span>
        <span
          aria-hidden
          className={`ml-auto text-[11px] text-ink-subtle transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      <Collapse open={open}>
        <div className="grid gap-5 border-t border-border-token px-4 py-4 sm:px-5 md:grid-cols-3">
          <GuideColumn title="문체">
            <ul className="m-0 list-none space-y-1.5 p-0">
              {VOICE_RULES.map((v) => (
                <li key={v} className="flex gap-2 text-[13px] leading-[1.55] text-ink-soft">
                  <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-subtle" />
                  {v}
                </li>
              ))}
            </ul>
          </GuideColumn>

          <GuideColumn title="필수 구성">
            <ul className="m-0 list-none space-y-2.5 p-0">
              {REQUIRED_PARTS.map((p) => (
                <li key={p.key}>
                  <div className="font-sans text-[13px] font-semibold text-ink">{p.label}</div>
                  <div className="text-[12.5px] leading-[1.55] text-ink-muted">{p.how}</div>
                </li>
              ))}
            </ul>
          </GuideColumn>

          <GuideColumn title="권장 뼈대">
            <ol className="m-0 list-none space-y-2 p-0">
              {OUTLINE.map(([h, d], i) => (
                <li key={h} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-alt font-mono text-[10.5px] text-ink-muted">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-[1.5]">
                    <span className="font-semibold text-ink">{h}</span>
                    <span className="text-ink-muted"> · {d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </GuideColumn>

          <div className="md:col-span-3">
            <div className="mb-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              피할 표현
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVOID.map((a) => (
                <span
                  key={a.label}
                  title={a.hint}
                  className="rounded-md bg-surface-alt px-2 py-1 text-[12px] text-ink-muted line-through decoration-ink-subtle"
                >
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Collapse>
    </div>
  );
}

function GuideColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {title}
      </div>
      {children}
    </div>
  );
}

/* ── 진행바 ──────────────────────────────────────────────────────────── */

/**
 * 다섯 칸짜리 진행바. 끝낸 칸은 마운트 뒤 왼쪽부터 차례로 차오르고, 다음
 * 칸은 단계 색으로 숨 쉰다 — "지금 여기"가 정지 화면에서도 읽힌다.
 */
function Progress({ topic }: { topic: TopicRow }) {
  const done = stageIndex(topic.stage);
  const paused = topic.droppedReason !== null;
  const next = nextStage(topic.stage);
  const mounted = useMounted();

  return (
    <div>
      <div className="flex gap-1">
        {STAGES.map((s, i) => {
          const isDone = i <= done;
          const isNext = i === done + 1 && !paused;
          return (
            <span
              key={s.key}
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: mounted && isDone ? "100%" : "0%",
                  transitionDelay: `${i * 90}ms`,
                  background: paused ? "var(--ink-subtle)" : "var(--ink)",
                }}
              />
              {isNext && (
                <>
                  <span
                    className="topic-pulse absolute inset-0 rounded-full"
                    style={{ background: tone(s.key).fg }}
                  />
                  <span className="topic-sheen absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                </>
              )}
            </span>
          );
        })}
      </div>
      <div
        className="mt-1.5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}
      >
        {STAGES.map((s, i) => (
          <span
            key={s.key}
            className={`truncate font-sans text-[10.5px] transition-colors duration-300 ${
              next && i === done + 1 && !paused
                ? "font-semibold text-ink"
                : i <= done
                  ? "text-ink-muted"
                  : "text-ink-subtle"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 주제 카드 ───────────────────────────────────────────────────────── */

function TopicCard({
  index,
  topic,
  candidates,
  onChange,
  onDelete,
}: {
  index: number;
  topic: TopicRow;
  candidates: QueueRow[];
  onChange: (t: TopicRow) => void;
  onDelete: () => void;
}) {
  const [mode, setMode] = useState<"view" | "advance" | "edit" | "drop">("view");
  const [note, setNote] = useState("");
  const [slug, setSlug] = useState(topic.postSlug ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const next = nextStage(topic.stage);
  const paused = topic.droppedReason !== null;
  const lane = laneOf(topic);
  const c = tone(lane);
  const urls = new Map(candidates.map((x) => [x.id, x.url]));
  const history = STAGES.filter((s) => topic.checks[s.key]);
  const step = stageIndex(topic.stage) + 1;
  // 처음 그릴 때 한 장씩 차례로 떠오른다. 너무 길어지지 않게 8장에서 끊는다.
  const rise = { animationDelay: `${Math.min(index, 8) * 55}ms` };

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await call("PATCH", { id: topic.id, ...body });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return false;
    }
    if ("topic" in res) onChange(res.topic);
    setMode("view");
    return true;
  }

  async function remove() {
    setConfirmDelete(false);
    setBusy(true);
    const res = await call("DELETE", { id: topic.id });
    setBusy(false);
    if ("error" in res) setError(res.error);
    else onDelete();
  }

  if (mode === "edit") {
    return (
      <li className="topic-rise row-span-8 rounded-xl border border-border-strong bg-surface p-5">
        <div className="mb-3 font-sans text-[13px] font-semibold text-ink">주제 편집</div>
        <TopicEditor
          initial={topic}
          candidates={candidates}
          submitLabel="저장"
          onCancel={() => setMode("view")}
          onSubmit={async (input) => {
            const res = await call("PATCH", { action: "edit", id: topic.id, ...input });
            if ("topic" in res) {
              onChange(res.topic);
              setMode("view");
            }
            return res;
          }}
        />
      </li>
    );
  }

  return (
    <li
      style={rise}
      className={`topic-rise row-span-8 grid grid-rows-subgrid gap-0 rounded-xl border bg-surface p-5 transition-[transform,box-shadow,border-color] duration-300 ease-out ${
        paused
          ? "border-dashed border-border-token"
          : "border-border-token hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_14px_32px_-18px_rgba(0,0,0,0.28)]"
      }`}
    >
      {/*
        카드는 여덟 구역(머리·제목·설명·진행바·글감·다음 할 일·기록·동작)으로
        고정하고 subgrid 로 이웃 카드와 줄을 맞춘다. 설명이 한 줄인 카드와
        두 줄인 카드가 나란해도 진행바와 NEXT 박스가 같은 높이에서 시작한다.
        그래서 비어 있는 구역도 자리는 남긴다.
      */}
      {/* 1 머리 — 지금 단계 배지와 진척 */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-[11.5px] font-semibold transition-colors duration-500"
          style={
            paused
              ? { background: "var(--surface-alt)", color: "var(--ink-muted)" }
              : { background: c.bg, color: c.ink }
          }
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full bg-current ${paused || !next ? "" : "topic-ring"}`}
            style={{ color: paused ? "var(--ink-subtle)" : c.fg }}
          />
          {paused ? "접음" : next ? `${next.label} 차례` : "발행 완료"}
        </span>
        <span className="font-mono text-[11.5px] tabular-nums text-ink-subtle">
          {step}/{STAGES.length}
        </span>
      </div>

      <h3
        className={`m-0 mt-3.5 font-sans text-[16.5px] font-semibold leading-[1.35] tracking-[-0.015em] ${
          paused ? "text-ink-muted" : "text-ink"
        }`}
      >
        {topic.title}
      </h3>
      <p className="m-0 mt-1.5 text-[13.5px] leading-[1.6] text-ink-muted">{topic.angle}</p>

      <div className="mt-4">
        <Progress topic={topic} />
      </div>

      {/* 5 글감 — 레포 이름은 한 번만. 태그가 셋이어도 한 줄에 든다. */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {groupByRepo(topic.candidates).map(([repo, items]) => (
          <span key={repo} className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-sans text-[11.5px] text-ink-subtle">{repo.split("/")[1]}</span>
            {items.map((x) => (
              <a
                key={x.id}
                href={urls.get(x.id) ?? `https://github.com/${x.repo}/releases/tag/${x.tag}`}
                target="_blank"
                rel="noreferrer"
                title={x.id}
                className="rounded-md bg-surface-alt px-1.5 py-[2px] font-mono text-[11px] text-ink-soft no-underline transition-colors hover:text-ink"
              >
                {x.tag}
              </a>
            ))}
          </span>
        ))}
      </div>

      {/* 6 다음 할 일 — 카드에서 가장 눈에 띄어야 하는 자리. 이웃 카드가 폼을
          펼쳐 줄이 길어져도 늘어나지 않게 위에 붙인다. */}
      <div className="mt-4 self-start">
      <div className="rounded-lg bg-surface-alt p-3.5">
        {paused ? (
          <>
            <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              접은 이유
            </div>
            <p className="m-0 mt-1 text-[13.5px] leading-[1.55] text-ink-soft">
              {topic.droppedReason}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => patch({ action: "drop", reason: null })}
              className="mt-3 rounded-full border border-border-token bg-surface px-3 py-1 font-sans text-[12.5px] text-ink-soft transition-colors hover:border-border-strong disabled:opacity-40"
            >
              다시 펼치기
            </button>
          </>
        ) : next ? (
          <>
            <div
              className="font-sans text-[10.5px] font-bold uppercase tracking-[0.08em]"
              style={{ color: c.fg }}
            >
              Next · {next.label}
            </div>
            <p className="m-0 mt-1 text-[13.5px] leading-[1.55] text-ink-soft">{next.todo}</p>

            <Collapse open={mode === "advance"}>
              <div className="space-y-2 pt-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={NOTE_HINT[next.key]}
                  className={field}
                />
                {next.key === "draft" && (
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="글 slug"
                    className={`${field} font-mono text-[13px]`}
                  />
                )}
                <div className="flex gap-1.5">
                  <Btn
                    primary
                    disabled={busy || !note.trim()}
                    onClick={() =>
                      patch({
                        action: "advance",
                        note,
                        postSlug: slug.trim() || null,
                      }).then((ok) => ok && setNote(""))
                    }
                  >
                    {next.label} 완료
                  </Btn>
                  <Btn onClick={() => setMode("view")}>취소</Btn>
                </div>
              </div>
            </Collapse>
            <Collapse open={mode === "drop"}>
              <div className="space-y-2 pt-3">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="접는 이유. 예: 이미 한국어 글이 충분하다"
                  className={field}
                />
                <div className="flex gap-1.5">
                  <Btn
                    primary
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      patch({ action: "drop", reason }).then((ok) => ok && setReason(""))
                    }
                  >
                    접기
                  </Btn>
                  <Btn onClick={() => setMode("view")}>취소</Btn>
                </div>
              </div>
            </Collapse>
            <Collapse open={mode === "view"}>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setMode("advance")}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
                >
                  {next.label} 기록하기
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </button>
              </div>
            </Collapse>
          </>
        ) : (
          <>
            <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              발행 완료
            </div>
            {topic.postSlug && (
              <a
                href={`/posts/${topic.postSlug}`}
                className="mt-1 inline-block font-mono text-[13px] text-ink no-underline underline-offset-4 hover:underline"
              >
                /posts/{topic.postSlug} →
              </a>
            )}
          </>
        )}
      </div>
      <AiPanel topic={topic} onChange={onChange} />
      </div>

      {/* 7 작업 노트, 근거 타임라인, 오류 */}
      <div>
      {topic.notes && <Notes markdown={topic.notes} />}
      {history.length > 0 && (
        <ol className="m-0 ml-[3px] mt-4 list-none space-y-3 border-l border-border-token p-0 pl-4">
          {history.map((s) => {
            const check = topic.checks[s.key]!;
            return (
              <li key={s.key} className="topic-rise relative">
                <span
                  aria-hidden
                  className="absolute -left-[20.5px] top-[6px] size-[7px] rounded-full ring-2 ring-surface"
                  style={{ background: tone(s.key).fg }}
                />
                <div className="flex items-baseline gap-2">
                  <span className="font-sans text-[12.5px] font-semibold text-ink-soft">
                    {s.label}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-ink-subtle">
                    {check.at.slice(5, 10).replace("-", ".")}
                  </span>
                </div>
                <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-ink-muted">
                  {check.note}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {error && (
        <p className="topic-rise m-0 mt-3 whitespace-pre-line rounded-lg border border-danger/30 px-3 py-2.5 text-[12.5px] leading-[1.6] text-danger">
          {error}
        </p>
      )}

      </div>

      {/* 8 보조 동작 — 조용하게 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 self-end pt-4">
        {topic.postSlug && next && (
          <a
            href={`/posts/${topic.postSlug}`}
            className="mr-auto font-mono text-[11.5px] text-ink-muted no-underline hover:text-ink"
          >
            /{topic.postSlug}
          </a>
        )}
        <div className="ml-auto flex items-center gap-3">
          {!paused && stageIndex(topic.stage) > 0 && (
            <Quiet disabled={busy} onClick={() => patch({ action: "revert" })}>
              ↶ {stageLabel(topic.stage)} 취소
            </Quiet>
          )}
          <Quiet onClick={() => setMode("edit")}>편집</Quiet>
          {!paused && next && mode === "view" && (
            <Quiet onClick={() => setMode("drop")}>접기</Quiet>
          )}
          <Quiet danger disabled={busy} onClick={() => setConfirmDelete(true)}>
            삭제
          </Quiet>
        </div>
        <ConfirmDialog
          open={confirmDelete}
          tone="danger"
          title={`'${topic.title}' 주제를 지울까요?`}
          body="진행 기록이 함께 사라집니다. 글감은 남습니다. 멈추려는 것이라면 접기로 두세요."
          confirmLabel="지우기"
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </li>
  );
}

/* ── AI 작업 ─────────────────────────────────────────────────────────── */

/** AI 가 어디까지 갈지. 발행은 고를 수 없다 — 공개는 사람이 정한다. */
const UNTIL_OPTIONS: { key: AiUntil; label: string }[] = [
  { key: "sources", label: "2차 소스까지" },
  { key: "assets", label: "자료까지" },
  { key: "draft", label: "초안까지" },
  { key: "review", label: "점검까지" },
];

function untilLabel(key: AiUntil | null) {
  return UNTIL_OPTIONS.find((o) => o.key === key)?.label ?? "";
}

function ago(iso: string | null): string {
  if (!iso) return "";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.round(h / 24)}일 전`;
}

/**
 * "AI에게 맡기기". 누르면 요청만 쌓이고, 실행기(루틴·크론)가 다음 실행 때
 * 집어서 실제로 조사·자료·초안·점검을 하고 단계를 넘긴다.
 */
function AiPanel({ topic, onChange }: { topic: TopicRow; onChange: (t: TopicRow) => void }) {
  const left = UNTIL_OPTIONS.filter((o) => stageIndex(o.key) > stageIndex(topic.stage));
  const [until, setUntil] = useState<AiUntil>("review");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, message, updatedAt } = topic.ai;

  if (topic.droppedReason !== null || (left.length === 0 && !status)) return null;

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await call("PATCH", { id: topic.id, ...body });
    setBusy(false);
    if ("error" in res) setError(res.error);
    else if ("topic" in res) onChange(res.topic);
  }

  const pick = left.some((o) => o.key === until) ? until : left[left.length - 1]?.key;

  return (
    <div className="mt-2 rounded-lg border border-dashed border-border-token px-3 py-2.5">
      {status === "queued" || status === "running" ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${status === "running" ? "topic-pulse" : ""}`}
            style={{ background: status === "running" ? "var(--callout-tip-glyph)" : "var(--ink-subtle)" }}
          />
          <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-ink-soft">
            {status === "running" ? (
              <>
                <b className="font-semibold text-ink">AI 작업 중</b> · {message ?? "진행 중"}
              </>
            ) : (
              <>
                <b className="font-semibold text-ink">AI 대기 중</b> · {untilLabel(topic.ai.until)}, 다음 실행 때 시작
              </>
            )}
            <span className="ml-1.5 font-mono text-[11px] text-ink-subtle">{ago(updatedAt)}</span>
          </span>
          <Quiet disabled={busy} onClick={() => send({ action: "ai_cancel" })}>
            취소
          </Quiet>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {status === "failed" ? (
            <span className="w-full whitespace-pre-line text-[12.5px] leading-[1.5] text-danger">
              <b className="font-semibold">AI 멈춤</b> · {message}
            </span>
          ) : (
            message && (
              <span className="w-full text-[12px] leading-[1.5] text-ink-muted">
                <b className="font-semibold text-ink-soft">AI</b> · {message}
                <span className="ml-1.5 font-mono text-[11px] text-ink-subtle">{ago(updatedAt)}</span>
              </span>
            )
          )}
          {left.length > 0 && pick && (
            <>
              <select
                value={pick}
                onChange={(e) => setUntil(e.target.value as AiUntil)}
                aria-label="AI 가 진행할 단계"
                className="rounded-full border border-border-token bg-surface px-2.5 py-1 font-sans text-[12px] text-ink-soft outline-none focus:border-border-strong"
              >
                {left.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => send({ action: "ai", until: pick })}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 font-sans text-[12px] font-medium text-ink transition-[background-color,transform] hover:bg-hover active:scale-[0.97] disabled:opacity-40"
              >
                <span aria-hidden>✦</span>
                {status === "failed" ? "다시 맡기기" : "AI에게 맡기기"}
              </button>
            </>
          )}
        </div>
      )}
      {error && <p className="m-0 mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  );
}

/** 작업 노트 — AI 가 조사한 내용·자료가 쌓이는 곳. 블로그 본문과 같은 렌더러. */
function Notes({ markdown }: { markdown: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <span aria-hidden className={`text-[9px] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
        작업 노트
        <span className="font-mono text-[11px] font-normal text-ink-subtle">
          {markdown.length.toLocaleString()}자
        </span>
      </button>
      <Collapse open={open}>
        <div className="mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-border-token bg-bg px-4 py-3 text-[13.5px] [&_h2]:mt-4 [&_h2]:text-[15px] [&_h3]:text-[14px]">
          {open && renderMarkdown(markdown)}
        </div>
      </Collapse>
    </div>
  );
}

/** 글감을 레포별로 묶는다. 순서는 처음 나온 레포 순. */
function groupByRepo(items: TopicRow["candidates"]): [string, TopicRow["candidates"]][] {
  const m = new Map<string, TopicRow["candidates"]>();
  for (const x of items) m.set(x.repo, [...(m.get(x.repo) ?? []), x]);
  return [...m];
}

function Btn({
  primary,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full px-3 py-1.5 font-sans text-[12.5px] font-medium transition-[color,background-color,border-color,opacity,transform] active:scale-[0.97] disabled:opacity-40 ${
        primary
          ? "bg-ink text-bg hover:opacity-90"
          : "border border-border-token bg-surface text-ink-soft hover:border-border-strong"
      }`}
    />
  );
}

function Quiet({
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`font-sans text-[12px] text-ink-muted transition-colors disabled:opacity-40 ${
        danger ? "hover:text-danger" : "hover:text-ink"
      }`}
    />
  );
}

/* ── 주제 편집 ───────────────────────────────────────────────────────── */

interface EditorInput {
  title: string;
  angle: string | null;
  candidateIds: string[];
}

function TopicEditor({
  initial,
  candidates,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: TopicRow;
  candidates: QueueRow[];
  submitLabel: string;
  onSubmit: (input: EditorInput) => Promise<CallResult>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [angle, setAngle] = useState(initial?.angle ?? "");
  const [picked, setPicked] = useState<Set<string>>(
    new Set(initial?.candidates.map((c) => c.id) ?? []),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 처음 열었을 때 묶여 있던 글감이 먼저, 그다음 쓸래, 새 글감 순. 체크할
  // 때마다 순서가 바뀌면 누르던 줄이 도망가므로 초기값 기준으로만 센다.
  const [initialIds] = useState(() => new Set(initial?.candidates.map((c) => c.id) ?? []));
  const rank = (c: QueueRow) =>
    initialIds.has(c.id) ? 0 : c.status === "queued" ? 1 : 2;
  const list = [...candidates].sort(
    (a, b) => rank(a) - rank(b) || b.publishedAt.localeCompare(a.publishedAt),
  );

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await onSubmit({
      title: title.trim(),
      angle: angle.trim() || null,
      candidateIds: [...picked],
    });
    setBusy(false);
    if ("error" in res) setError(res.error);
  }

  return (
    <div className="space-y-2.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="주제. 예: auto mode 가 기본값이 됐다"
        className={`${field} font-semibold`}
      />
      <input
        value={angle}
        onChange={(e) => setAngle(e.target.value)}
        placeholder="왜 쓸 만한가 — 한 줄"
        className={field}
      />
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-sans text-[12px] font-semibold text-ink-soft">묶을 글감</span>
          <span className="font-mono text-[11.5px] tabular-nums text-ink-muted">
            {picked.size}개 선택
          </span>
        </div>
        <ul className="m-0 max-h-[240px] list-none overflow-y-auto rounded-lg border border-border-token bg-bg p-1">
          {list.map((c) => {
            const on = picked.has(c.id);
            return (
              <li key={c.id}>
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                    on ? "bg-surface" : "hover:bg-hover"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(c.id)}
                    className="size-3.5 shrink-0 accent-[var(--ink)]"
                  />
                  <span className="shrink-0 font-mono text-[12px] text-ink">
                    <span className="text-ink-subtle">{c.repo.split("/")[1]} </span>
                    {c.tag}
                  </span>
                  {c.note && (
                    <span className="min-w-0 truncate text-[12px] text-ink-muted">{c.note}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
      <div className="flex gap-1.5 pt-1">
        <Btn primary disabled={busy || !title.trim()} onClick={submit}>
          {submitLabel}
        </Btn>
        <Btn onClick={onCancel}>취소</Btn>
      </div>
    </div>
  );
}
