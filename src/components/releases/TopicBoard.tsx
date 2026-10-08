"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { API } from "@/lib/api-routes";
import { Collapse } from "@/components/releases/Collapse";
import { useMounted } from "@/lib/hooks";
import { renderMarkdown } from "@/lib/markdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { ChoiceMenu } from "@/components/ui/Select";
import type { QueueRow } from "@/lib/release-queue";
import type { AiLogEntry, AiUntil, TopicRow } from "@/lib/release-topics";
import {
  STAGES,
  nextStage,
  stageIndex,
  stageLabel,
  type StageKey,
} from "@/lib/release-stages";
import { AVOID, CLARITY_RULES, OUTLINE, REQUIRED_PARTS, VOICE_RULES } from "@/lib/voice";

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

/**
 * 누가 움직일 차례인가. 판은 단계가 아니라 이 순서로 구역을 나눈다 —
 * 위에서부터 지금 봐야 하는 것.
 */
type Turn = "ai" | "me" | "later" | "idle" | "done";

const TURNS: { key: Turn; label: string; hint: string; color: string }[] = [
  { key: "ai", label: "AI 작성 중", hint: "작업 중에는 화면이 저절로 갱신됩니다", color: "var(--callout-tip-ink)" },
  { key: "me", label: "내 차례", hint: "남은 일을 처리해 발행하거나, 멈춘 작업을 다시 맡깁니다", color: "var(--callout-warning-ink)" },
  { key: "later", label: "예약", hint: "로컬 CLI 에서 집으면 시작합니다", color: "var(--ink-soft)" },
  { key: "idle", label: "맡기기 전", hint: "AI에게 맡기거나 직접 진행합니다", color: "var(--ink)" },
  { key: "done", label: "발행함", hint: "", color: "var(--ink-muted)" },
];

function turnOf(t: TopicRow): Turn {
  if (t.ai.status === "running") return "ai";
  if (t.ai.status === "queued") return t.ai.local ? "later" : "ai";
  const next = nextStage(t.stage);
  if (!next) return "done";
  return t.ai.status === "failed" || next.key === "published" ? "me" : "idle";
}

const TURN_DOT: Record<Turn, string> = {
  ai: "var(--callout-tip-glyph)",
  me: "var(--callout-warning-glyph)",
  later: "var(--ink-muted)",
  idle: "var(--border-strong)",
  done: "var(--ink-subtle)",
};

/** 행 앞 점과 미니 진행바의 다음 칸 색. 구역 색을 따르고, 멈춘 작업만 붉게. */
function dotColor(t: TopicRow): string {
  if (t.droppedReason !== null) return "var(--ink-subtle)";
  return t.ai.status === "failed" ? "var(--danger)" : TURN_DOT[turnOf(t)];
}

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
  const [creating, setCreating] = useState(false);
  /** 펼쳐 둔 접힘 구역 — 발행함, 접은 주제. */
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());

  const active = topics.filter((t) => t.droppedReason === null);
  const aiCount = topics.filter((t) => t.ai.status === "running").length;

  // 구역 안에서는 AI 가 쓰고 있는 주제, 대기 중인 주제가 먼저. 그다음 진행이
  // 덜 된 순, 같은 단계면 먼저 만든 순. 작성 중인 주제는 단계가 넘어가도
  // 'AI 작성 중' 구역을 떠나지 않는다.
  const aiRank = (t: TopicRow) => (t.ai.status === "running" ? 0 : t.ai.status === "queued" ? 1 : 2);
  const groups = [
    ...TURNS.map((g) => ({
      ...g,
      fold: g.key === "done",
      items: active
        .filter((t) => turnOf(t) === g.key)
        .sort((a, b) => aiRank(a) - aiRank(b) || stageIndex(a.stage) - stageIndex(b.stage) || a.id - b.id),
    })),
    {
      key: "dropped",
      label: "접은 주제",
      hint: "",
      color: "var(--ink-muted)",
      fold: true,
      items: topics.filter((t) => t.droppedReason !== null),
    },
  ].filter((g) => g.items.length > 0);

  function replace(topic: TopicRow) {
    onTopicsChange(
      topics.some((t) => t.id === topic.id)
        ? topics.map((t) => (t.id === topic.id ? topic : t))
        : [...topics, topic],
    );
    onQueued(topic.candidates.map((c) => c.id));
  }

  const remove = (id: number) => onTopicsChange(topics.filter((x) => x.id !== id));

  const toggleFold = (key: string) =>
    setUnfolded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  // 구역 머리와 행을 한 부모 아래 평평하게 둔다. 주제가 구역을 옮겨도(AI 가
  // 끝나 '내 차례'로 내려와도) 같은 key 의 형제라 펼침·편집·모달 상태가 남는다.
  // 구역 상자는 첫·끝 행이 테두리와 모서리를 직접 그린다. 셀렉트 목록이 행
  // 밖으로 펼쳐져야 해서 overflow-hidden 도 쓰지 않는다.
  const rows: ReactNode[] = [];
  groups.forEach((g, gi) => {
    const open = !g.fold || unfolded.has(g.key);
    rows.push(
      <div
        key={`head-${g.key}`}
        className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 md:col-span-full ${gi > 0 ? "mt-6" : ""} ${open ? "mb-2.5" : ""}`}
      >
        {g.fold ? (
          <button
            type="button"
            onClick={() => toggleFold(g.key)}
            aria-expanded={open}
            className="flex items-center gap-1.5 font-sans text-[13px] text-ink-muted transition-colors hover:text-ink"
          >
            <span aria-hidden className={`inline-block text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>
              ▶
            </span>
            {g.label}
            <span className="font-mono text-[12px] tabular-nums">{g.items.length}</span>
          </button>
        ) : (
          <>
            <h3 className="m-0 font-sans text-[14px] font-bold tracking-[-0.01em]" style={{ color: g.color }}>
              {g.label}
            </h3>
            <span className="font-mono text-[12px] tabular-nums text-ink-muted">{g.items.length}</span>
            <span className="font-sans text-[12px] text-ink-subtle">{g.hint}</span>
          </>
        )}
      </div>,
    );
    if (!open) return;
    g.items.forEach((t, i) =>
      rows.push(
        <TopicItem
          key={t.id}
          topic={t}
          first={i === 0}
          last={i === g.items.length - 1}
          candidates={candidates}
          onChange={replace}
          onDelete={() => remove(t.id)}
        />,
      ),
    );
  });

  return (
    <section className="mb-14">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Pipeline
          </div>
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
            집필 진행
            {aiCount > 0 && (
              <span className="topic-rise inline-flex items-center gap-1.5 rounded-full bg-[color:var(--callout-tip-bg)] px-2.5 py-0.5 text-[12px] font-semibold tracking-normal">
                <span aria-hidden className="ai-spin text-[11px] text-[color:var(--callout-tip-glyph)]">✦</span>
                <span className="ai-shimmer">AI 작성 중 {aiCount}</span>
              </span>
            )}
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

      {active.length === 0 && (
        <div className="topic-rise mb-6 rounded-xl border border-dashed border-border-token px-6 py-10 text-center">
          <p className="m-0 text-[14px] text-ink-muted">
            아직 주제가 없습니다. 쓸래로 고른 글감을 주제로 묶어보세요.
          </p>
        </div>
      )}
      {/* md 부터 판 전체가 한 grid 다. 행마다 subgrid 로 같은 칸(점·제목·진행바·칩·버튼·펼치기)을
          써서 진행바·칩·버튼이 구역을 넘어 같은 세로줄에 선다. 칸 폭은 보이는 행 중 가장 긴 것이 정한다. */}
      {/* 첫 칸 31px = 행 테두리 1 + 왼쪽 여백 16 + 점 칸 14. subgrid 의 테두리·여백은 첫 칸
          항목의 바깥 여백으로만 들어가고 고정 칸을 늘리지 않아서, 판에서 미리 더해 둔다. */}
      <div className="md:grid md:grid-cols-[31px_minmax(0,1fr)_auto_auto_auto_auto] md:gap-x-3">{rows}</div>
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
          <GuideColumn title="문체·설명">
            <ul className="m-0 list-none space-y-1.5 p-0">
              {[...CLARITY_RULES.slice(0, 4), ...VOICE_RULES].map((v) => (
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
  // AI 가 지금 이 칸을 쓰고 있으면 빛결을 빠르게, 라벨을 "AI 작성 중"으로.
  const writing = topic.ai.status === "running";

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
                  <span
                    className="topic-sheen absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    style={writing ? { animationDuration: "1.1s" } : undefined}
                  />
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
            {writing && i === done + 1 ? (
              <span className="ai-shimmer">AI 작성 중</span>
            ) : (
              s.label
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 주제 한 줄 ──────────────────────────────────────────────────────── */

type ChipTone = "tip" | "warning" | "muted" | "danger" | "plain";

/** 행 오른쪽 칸들 — md 부터 두 줄(제목·설명)에 걸쳐 가운데 선다. */
const SIDE = "md:row-span-2 md:row-start-1";
/** 발행 알약의 한 칸. md 부터는 칸 폭에 맞춰 고르게 늘어난다. */
const SEG =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 font-sans text-[12.5px] font-medium no-underline transition-colors md:flex-1";

const CHIP: Record<ChipTone, string> = {
  tip: "px-2.5 font-semibold bg-[color:var(--callout-tip-bg)] text-[color:var(--callout-tip-ink)]",
  warning: "px-2.5 font-semibold bg-[color:var(--callout-warning-bg)] text-[color:var(--callout-warning-ink)]",
  muted: "px-2.5 font-semibold bg-surface-alt text-ink-muted",
  danger: "px-2.5 font-semibold bg-[color-mix(in_srgb,var(--danger)_13%,var(--surface))] text-danger",
  plain: "font-medium text-ink-subtle",
};

/** "2026-10-07T…" → "10.07" */
const monthDay = (iso: string) => iso.slice(5, 10).replace("-", ".");

/** 상태는 이 칩 하나로만 말한다. */
function chipOf(t: TopicRow): { label: string; tone: ChipTone } {
  const next = nextStage(t.stage);
  if (t.droppedReason !== null) return { label: "접음", tone: "muted" };
  if (t.ai.status === "running") return { label: t.ai.prompt ? "고치는 중" : `${next?.label ?? ""} 쓰는 중`, tone: "tip" };
  if (t.ai.status === "queued") {
    return { label: t.ai.prompt ? (t.ai.local ? "고치기 예약" : "고치기 대기") : t.ai.local ? "예약" : "AI 대기", tone: "muted" };
  }
  if (!next) {
    const at = t.checks.published?.at;
    return { label: at ? `${monthDay(at)} 발행` : "발행함", tone: "plain" };
  }
  if (t.ai.status === "failed") return { label: "AI 멈춤", tone: "danger" };
  if (next.key === "published") return { label: "발행 대기", tone: "warning" };
  if (t.stage === "picked") return { label: "시작 전", tone: "muted" };
  return { label: `${stageLabel(t.stage)}까지 끝남`, tone: "muted" };
}

/** 여섯 칸 미니 진행바. 끝낸 칸은 채우고, 다음 칸은 구역 색으로 숨 쉰다. */
function MiniProgress({ topic }: { topic: TopicRow }) {
  const done = stageIndex(topic.stage);
  const paused = topic.droppedReason !== null;
  const next = nextStage(topic.stage);
  const label = `${done + 1}/${STAGES.length} · ${stageLabel(topic.stage)}까지 끝남`;
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex shrink-0 gap-0.5">
      {STAGES.map((s, i) => (
        <span
          key={s.key}
          className="relative h-1 w-[9px] overflow-hidden rounded-[2px] bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]"
        >
          {i <= done && (
            <span className="absolute inset-0" style={{ background: paused ? "var(--ink-subtle)" : "var(--ink)" }} />
          )}
          {!paused && next && i === done + 1 && (
            <span className="topic-pulse absolute inset-0" style={{ background: dotColor(topic) }} />
          )}
        </span>
      ))}
    </span>
  );
}

function PanelToggle({
  on,
  onClick,
  label,
  meta,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={on}
      className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
    >
      <span aria-hidden className={`text-[9px] transition-transform duration-200 ${on ? "rotate-90" : ""}`}>
        ▶
      </span>
      {label}
      {meta && <span className="font-mono text-[11px] font-normal text-ink-subtle">{meta}</span>}
    </button>
  );
}

/**
 * 주제 하나 = 한 줄. 첫 줄은 제목과 상태 칩·지금 누를 버튼 하나, 둘째 줄은
 * 지금 필요한 정보 하나(작성 중이면 실시간 로그, 내 차례면 남은 일). 제목을
 * 누르면 진행바·글감·노트·기록·보조 동작이 펼쳐진다.
 */
function TopicItem({
  topic,
  first,
  last,
  candidates,
  onChange,
  onDelete,
}: {
  topic: TopicRow;
  /** 구역 상자의 첫·끝 행 — 테두리 위·아래와 모서리를 그린다. */
  first: boolean;
  last: boolean;
  candidates: QueueRow[];
  onChange: (t: TopicRow) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  /** 펼친 칸 안에서는 하나만 연다. */
  const [panel, setPanel] = useState<null | "notes" | "history" | "ai">(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  /** 열린 모달. advance = 직접 완료, publish = 발행, drop = 접기, revise = AI 고치기. */
  const [dialog, setDialog] = useState<null | "advance" | "publish" | "drop" | "revise">(null);
  const [note, setNote] = useState("");
  const [prompt, setPrompt] = useState("");
  const [slug, setSlug] = useState(topic.postSlug ?? "");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState<AiUntil>("review");
  /** 예약으로 맡길지. 고르기 전에는 지난번 방식(폴링으로 바뀌어도 따라간다). */
  const [pickLocal, setLocal] = useState<boolean | null>(null);
  const local = pickLocal ?? topic.ai.local;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const next = nextStage(topic.stage);
  const paused = topic.droppedReason !== null;
  const { status, message, log, todo } = topic.ai;
  const running = status === "running";
  const aiBusy = running || status === "queued";
  const publishing = next?.key === "published";
  const history = STAGES.filter((s) => topic.checks[s.key]);
  const step = stageIndex(topic.stage) + 1;
  const chip = chipOf(topic);
  const urls = new Map(candidates.map((x) => [x.id, x.url]));
  // 맡길 수 있는 단계. 고른 단계가 이미 지났으면 맨 끝으로.
  const left = UNTIL_OPTIONS.filter((o) => stageIndex(o.key) > stageIndex(topic.stage));
  const pick = left.some((o) => o.key === until) ? until : left[left.length - 1]?.key;
  const hasAi = !running && (message !== null || log.length > 0);

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
    setDialog(null);
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

  const flip = (p: NonNullable<typeof panel>) => setPanel((v) => (v === p ? null : p));
  const edge = `border-x border-t border-border-token ${first ? "rounded-t-xl" : ""} ${last ? "rounded-b-xl border-b" : ""}`;

  if (mode === "edit") {
    return (
      <div className={`${edge} bg-surface p-5 md:col-span-full`}>
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
      </div>
    );
  }

  // 지금 누를 것 하나. 알약 버튼(맡기기·발행)은 칸 폭까지 늘려 양 끝을 맞춘다.
  let action: ReactNode = null;
  let fill = false;
  if (paused) {
    action = (
      <Btn disabled={busy} onClick={() => patch({ action: "drop", reason: null })}>
        다시 펼치기
      </Btn>
    );
  } else if (running) {
    action = (
      <>
        {topic.ai.startedAt && <Elapsed since={topic.ai.startedAt} />}
        <Quiet disabled={busy} onClick={() => patch({ action: "ai_cancel" })}>
          중지
        </Quiet>
      </>
    );
  } else if (status === "queued") {
    action = (
      <Quiet disabled={busy} onClick={() => patch({ action: "ai_cancel" })}>
        취소
      </Quiet>
    );
  } else if (!next) {
    action = topic.postSlug && (
      <a
        href={`/posts/${topic.postSlug}`}
        className="whitespace-nowrap font-sans text-[12px] text-ink-muted no-underline transition-colors hover:text-ink"
      >
        글 보기 →
      </a>
    );
  } else if (publishing) {
    fill = true;
    action = (
      <div className="inline-flex items-stretch rounded-full border border-border-strong bg-surface text-ink-soft md:flex-1">
        {topic.postSlug && (
          <>
            <a
              href={`/preview/${topic.postSlug}`}
              target="_blank"
              rel="noreferrer"
              className={`${SEG} rounded-l-full pl-3.5 hover:bg-hover hover:text-ink`}
            >
              미리보기
              <span aria-hidden className="text-[11px] opacity-80">↗</span>
            </a>
            <span aria-hidden className="my-1.5 w-px bg-border-strong" />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDialog("revise");
          }}
          className={`${SEG} text-[var(--callout-tip-ink)] hover:bg-hover ${topic.postSlug ? "" : "rounded-l-full pl-3.5"}`}
        >
          <span aria-hidden className="text-[12px] text-[var(--callout-tip-glyph)]">✦</span>
          고치기
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDialog("publish");
          }}
          className={`${SEG} -my-px -mr-px rounded-r-full bg-ink pr-3.5 font-semibold text-bg hover:opacity-90`}
        >
          발행하기
        </button>
      </div>
    );
  } else if (pick) {
    fill = true;
    action = (
      <AiLaunch
        options={left}
        from={stageIndex(topic.stage)}
        value={pick}
        onChange={setUntil}
        local={local}
        onLocal={setLocal}
        retry={status === "failed"}
        busy={busy}
        onLaunch={() => patch({ action: "ai", until: pick, local })}
      />
    );
  }

  // 둘째 줄 — 지금 필요한 정보 하나.
  let sub: ReactNode;
  if (paused) sub = topic.droppedReason;
  else if (running) {
    sub = (
      <>
        {log[log.length - 1]?.message ?? message ?? "작업 시작"}
        <Dots />
      </>
    );
  } else if (status === "queued") {
    sub = topic.ai.prompt ? (
      <>
        <b className="mr-1 font-semibold text-ink-soft">고치기</b>
        {topic.ai.prompt}
      </>
    ) : (
      <>
        <b className="mr-1 font-semibold text-ink-soft">{untilLabel(topic.ai.until)}</b>
        <AiMessage text={message ?? "다음 실행 때 시작"} />
      </>
    );
  } else if (!next) sub = <span className="font-mono text-[12px]">/posts/{topic.postSlug}</span>;
  else if (todo) {
    sub = (
      <>
        <b className="mr-1 font-semibold text-ink-soft">남은 일</b>
        {todo}
      </>
    );
  } else if (status === "failed" || (publishing && message)) sub = message;
  else sub = topic.angle;

  return (
    <div
      className={`${edge} md:col-span-full md:grid md:grid-cols-subgrid ${running ? "bg-[color-mix(in_srgb,var(--callout-tip-bg)_45%,var(--surface))]" : "bg-surface"}`}
    >
      <div className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-x-3 gap-y-[3px] py-3 pr-3 pl-4 md:col-span-full md:grid-cols-subgrid">
        <span
          aria-hidden
          className={`col-start-1 row-start-1 size-[7px] justify-self-center rounded-full ${running ? "topic-pulse" : ""}`}
          style={{ background: dotColor(topic) }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`col-start-2 row-start-1 justify-self-start text-left font-sans text-[14.5px] font-semibold leading-[1.4] tracking-[-0.01em] decoration-ink-subtle underline-offset-4 hover:underline ${
            paused ? "text-ink-muted" : "text-ink"
          }`}
        >
          {topic.title}
        </button>
        <div className="col-start-2 row-start-2 line-clamp-2 min-w-0 text-[13px] leading-[1.5] text-ink-muted md:line-clamp-1">
          {sub}
        </div>
        {/* 좁은 화면에선 셋째 줄에 한 줄로, md 부터는 각자 판의 칸(3~6열)에 선다. */}
        <div className="col-start-2 row-start-3 flex flex-wrap items-center gap-2.5 pt-1.5 md:contents">
          <span className={`flex ${SIDE} md:col-start-3`}>
            <MiniProgress topic={topic} />
          </span>
          <span className={`whitespace-nowrap rounded-full py-[3px] font-sans text-[11.5px] ${SIDE} md:col-start-4 md:justify-self-start ${CHIP[chip.tone]}`}>
            {chip.label}
          </span>
          {action && (
            <div className={`flex items-center gap-2.5 ${SIDE} md:col-start-5 ${fill ? "md:justify-self-stretch" : "md:justify-self-end"}`}>
              {action}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "접기" : "자세히"}
            className={`flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-hover hover:text-ink ${SIDE} md:col-start-6`}
          >
            <svg
              viewBox="0 0 12 12"
              aria-hidden
              className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            >
              <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 접혀 있어도 보여야 하는 것 — 맡기기·발행 버튼이 낸 오류. */}
      {error && !dialog && (
        <p className="topic-rise mx-4 mt-0 mb-3 whitespace-pre-line rounded-lg border border-danger/30 px-3 py-2.5 text-[12.5px] leading-[1.6] text-danger md:col-span-full md:ml-[42px]">
          {error}
        </p>
      )}

      <Collapse open={open} className="md:col-span-full">
        <div className="px-4 pt-0.5 pb-4 md:pl-[42px]">
          <div className="max-w-[560px]">
            <Progress topic={topic} />
          </div>

          {topic.candidates.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
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
          )}

          {running && (
            <div className="mt-3">
              <div className="font-sans text-[12px] text-ink-muted">
                {topic.ai.prompt ? "고치기 맡김" : `${untilLabel(topic.ai.until)} 맡김`}
              </div>
              <AiLog entries={log} live fallback={message} />
            </div>
          )}

          {(topic.notes || history.length > 0 || hasAi) && (
            <div className="mt-3.5 flex flex-wrap gap-x-[18px] gap-y-1.5">
              {topic.notes && (
                <PanelToggle
                  on={panel === "notes"}
                  onClick={() => flip("notes")}
                  label="작업 노트"
                  meta={`${topic.notes.length.toLocaleString()}자`}
                />
              )}
              {history.length > 0 && (
                <PanelToggle
                  on={panel === "history"}
                  onClick={() => flip("history")}
                  label="진행 기록"
                  meta={`${history.length}단계 · ${monthDay(topic.checks[history[history.length - 1].key]!.at)}`}
                />
              )}
              {hasAi && (
                <PanelToggle
                  on={panel === "ai"}
                  onClick={() => flip("ai")}
                  label="AI 기록"
                  meta={log.length > 0 ? `${log.length}줄 · ${duration(log[0].at, log[log.length - 1].at)}` : undefined}
                />
              )}
            </div>
          )}

          {panel === "notes" && topic.notes && (
            <div className="mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-border-token bg-bg px-4 py-3 text-[13.5px] [&_h2]:mt-4 [&_h2]:text-[15px] [&_h3]:text-[14px]">
              {renderMarkdown(topic.notes)}
            </div>
          )}

          {panel === "history" && history.length > 0 && (
            <ol className="m-0 mt-3 ml-[3px] list-none space-y-3 border-l border-border-token p-0 pl-4">
              {history.map((s) => {
                const check = topic.checks[s.key]!;
                return (
                  <li key={s.key} className="relative">
                    <span
                      aria-hidden
                      className="absolute top-[6px] -left-[20.5px] size-[7px] rounded-full ring-2 ring-surface"
                      style={{ background: tone(s.key).fg }}
                    />
                    <div className="flex items-baseline gap-2">
                      <span className="font-sans text-[12.5px] font-semibold text-ink-soft">{s.label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-ink-subtle">{monthDay(check.at)}</span>
                    </div>
                    <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-ink-muted">
                      {check.note}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          {panel === "ai" && hasAi && (
            <div className="mt-2 rounded-lg border border-dashed border-border-token px-3 py-2.5">
              {message &&
                (status === "failed" ? (
                  <p className="m-0 whitespace-pre-line text-[12.5px] leading-[1.55] text-danger">
                    <b className="font-semibold">AI 멈춤</b> · {message}
                  </p>
                ) : (
                  <p className="m-0 text-[12.5px] leading-[1.55] text-ink-muted">
                    <b className="font-semibold text-ink-soft">AI</b> · <AiMessage text={message} />
                    <span suppressHydrationWarning className="ml-1.5 font-mono text-[11px] text-ink-subtle">
                      {ago(topic.ai.updatedAt)}
                    </span>
                  </p>
                ))}
              {log.length > 0 && <AiLog entries={log} />}
            </div>
          )}

          {/* 보조 동작 — 조용하게 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            {topic.postSlug && next && (
              <a
                href={`/preview/${topic.postSlug}`}
                target="_blank"
                rel="noreferrer"
                title="발행 전 미리보기"
                className="mr-auto font-mono text-[11.5px] text-ink-muted no-underline hover:text-ink"
              >
                /{topic.postSlug}
              </a>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
              {!paused && stageIndex(topic.stage) > 0 && (
                <Quiet disabled={busy} onClick={() => patch({ action: "revert" })}>
                  ↶ {topic.stage === "published" ? "발행 취소(draft로)" : `${stageLabel(topic.stage)} 취소`}
                </Quiet>
              )}
              {!paused && next && !publishing && !aiBusy && (
                <Quiet
                  onClick={() => {
                    setError(null);
                    setDialog("advance");
                  }}
                  title="AI 없이 이 단계를 직접 했을 때, 근거를 남기고 다음 단계로 넘깁니다"
                >
                  {next.label} 직접 완료
                </Quiet>
              )}
              <Quiet onClick={() => setMode("edit")}>편집</Quiet>
              {!paused && next && (
                <Quiet
                  onClick={() => {
                    setError(null);
                    setDialog("drop");
                  }}
                >
                  접기
                </Quiet>
              )}
              <Quiet danger disabled={busy} onClick={() => setConfirmDelete(true)}>
                삭제
              </Quiet>
            </div>
          </div>
        </div>
      </Collapse>

      {/* 대화창은 접히는 칸 밖에 둔다 — 닫힌 칸은 inert 라 그 안에서는 뜨지 않는다. */}
      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        title={`'${topic.title}' 주제를 지울까요?`}
        body="진행 기록이 함께 사라집니다. 글감은 남습니다. 멈추려는 것이라면 접기로 두세요."
        confirmLabel="지우기"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
      {next && (
        <Modal
          open={dialog === "advance"}
          eyebrow={`${step}/${STAGES.length} · ${next.label}`}
          title={`${next.label} 단계를 직접 끝냈나요?`}
          description={
            <>
              AI 없이 이 단계를 직접 했을 때 씁니다. 남긴 근거는 진행 기록에 쌓이고 다음 단계로 넘어갑니다.
              <span className="mt-1 block text-[12.5px] text-ink-muted">할 일: {next.todo}</span>
            </>
          }
          confirmLabel={`${next.label} 완료`}
          confirmDisabled={!note.trim() || (next.key === "draft" && !slug.trim())}
          busy={busy}
          error={dialog === "advance" ? error : null}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            patch({ action: "advance", note: note.trim(), postSlug: slug.trim() || null }).then((ok) => ok && setNote(""))
          }
        >
          <Field label="근거">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={NOTE_HINT[next.key]}
              className={field}
            />
          </Field>
          {next.key === "draft" && (
            <Field label="글 slug" hint="영어 소문자·하이픈">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="claude-code-auto-mode"
                className={`${field} font-mono text-[13px]`}
              />
            </Field>
          )}
        </Modal>
      )}
      <Modal
        open={dialog === "publish"}
        tone="accent"
        eyebrow="발행"
        title={`'${topic.title}'을 공개할까요?`}
        description={
          <>
            문체·구성 점검을 한 번 더 돌리고, 통과하면 바로 블로그에 올라갑니다. 캡처 자리(todo-)가 남아 있으면 막힙니다.
            {todo && <span className="mt-1 block text-[12.5px] text-ink-muted">남은 일: {todo}</span>}
          </>
        }
        confirmLabel={busy ? "공개하는 중…" : "공개하기"}
        busy={busy}
        error={dialog === "publish" ? error : null}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          patch({ action: "advance", note: note.trim() || "발행", postSlug: topic.postSlug, expect: "published" }).then(
            (ok) => ok && setNote(""),
          )
        }
      >
        {topic.postSlug && (
          <a
            href={`/preview/${topic.postSlug}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-3 rounded-lg border border-border-token bg-surface-alt px-3 py-2.5 no-underline transition-colors hover:border-border-strong"
          >
            <span className="font-mono text-[12.5px] text-ink-soft">/posts/{topic.postSlug}</span>
            <span className="inline-flex items-center gap-1 font-sans text-[12px] font-medium text-ink">
              발행 전 미리보기
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
            </span>
          </a>
        )}
        <Field label="발행 메모" hint="선택">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={field} />
        </Field>
      </Modal>
      <Modal
        open={dialog === "revise"}
        tone="accent"
        eyebrow="AI 고치기"
        title="무엇을 고칠까요?"
        description={`'${topic.title}' 초안을 지시대로 고치고 점검을 다시 돌립니다. 단계는 그대로이고 발행은 하지 않습니다.`}
        confirmLabel={local ? "고치기 예약" : "고쳐 맡기기"}
        confirmDisabled={!prompt.trim()}
        busy={busy}
        error={dialog === "revise" ? error : null}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          patch({ action: "ai", until: "review", local, prompt: prompt.trim() }).then((ok) => ok && setPrompt(""))
        }
      >
        <Field label="지시">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="예: 도입부를 두 문장으로 줄이고, 가격 표에 이전 모델 행을 더해 주세요."
            className={field}
          />
        </Field>
        <div role="group" aria-label="어디서 실행할까요" className="grid gap-2 sm:grid-cols-2">
          {WHERE.map((o) => {
            const on = local === (o.value === "local");
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => setLocal(o.value === "local")}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  on
                    ? "border-[color-mix(in_oklab,var(--callout-tip-glyph)_55%,var(--border))] bg-[color-mix(in_oklab,var(--callout-tip-bg)_70%,var(--surface))]"
                    : "border-border-token hover:border-border-strong"
                }`}
              >
                <span className="block font-sans text-[12.5px] font-semibold text-ink">{o.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-ink-muted">{o.hint}</span>
              </button>
            );
          })}
        </div>
      </Modal>
      <Modal
        open={dialog === "drop"}
        eyebrow="접기"
        title="이 주제를 접어 둘까요?"
        description="지우지 않고 목록 아래로 내립니다. 언제든 다시 펼칠 수 있습니다."
        confirmLabel="접기"
        confirmDisabled={!reason.trim()}
        busy={busy}
        error={dialog === "drop" ? error : null}
        onClose={() => setDialog(null)}
        onConfirm={() => patch({ action: "drop", reason }).then((ok) => ok && setReason(""))}
      >
        <Field label="접는 이유">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 이미 한국어 글이 충분하다"
            className={field}
          />
        </Field>
      </Modal>
    </div>
  );
}

/* ── AI 작업 ─────────────────────────────────────────────────────────── */

/** AI 가 어디까지 갈지. 발행은 고를 수 없다 — 공개는 사람이 정한다. */
const UNTIL_OPTIONS: { key: AiUntil; label: string; hint: string }[] = [
  { key: "sources", label: "2차 소스까지", hint: "공식 문서·PR·이슈를 읽고 맥락을 정리" },
  { key: "assets", label: "자료까지", hint: "비교 표·그림 블록을 만들고 slug 를 정함" },
  { key: "draft", label: "초안까지", hint: "합니다체 초안을 draft 로 씀" },
  { key: "review", label: "점검까지", hint: "문체·구성 점검을 통과시킴. 발행만 남김" },
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

/** AI 작업을 어디서 돌릴지. */
const WHERE = [
  { value: "now", label: "바로 실행", hint: "클라우드 루틴을 지금 깨워 작업합니다" },
  { value: "local", label: "예약", hint: "쌓아 두었다가 로컬 CLI 에서 집을 때 작업합니다" },
];

/**
 * 맡기기 버튼 — 이름이 누르면 일어날 일을 그대로 말한다("점검까지 맡기기").
 * 오른쪽 화살표 하나로 어디까지·어디서를 고른다.
 */
function AiLaunch({
  options,
  from,
  value,
  onChange,
  local,
  onLocal,
  retry,
  busy,
  onLaunch,
}: {
  options: typeof UNTIL_OPTIONS;
  from: number;
  value: AiUntil;
  onChange: (v: AiUntil) => void;
  local: boolean;
  onLocal: (v: boolean) => void;
  retry: boolean;
  busy: boolean;
  onLaunch: () => void;
}) {
  const half =
    "transition-colors hover:bg-[color-mix(in_oklab,var(--callout-tip-glyph)_14%,transparent)] disabled:opacity-40";
  const verb = local ? (retry ? "다시 예약" : "예약") : retry ? "다시 맡기기" : "맡기기";
  return (
    <div className="relative inline-flex items-stretch rounded-full border border-[color-mix(in_oklab,var(--callout-tip-glyph)_45%,var(--border))] bg-[color-mix(in_oklab,var(--callout-tip-bg)_70%,var(--surface))] text-[var(--callout-tip-ink)] md:flex-1">
      <button
        type="button"
        disabled={busy}
        onClick={onLaunch}
        className={`group inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-l-full py-1.5 pr-3 pl-3.5 font-sans text-[12.5px] font-semibold active:scale-[0.98] md:flex-1 ${half}`}
      >
        <span aria-hidden className="text-[12px] text-[var(--callout-tip-glyph)] transition-transform duration-500 group-hover:rotate-[72deg]">
          ✦
        </span>
        {busy ? "맡기는 중…" : `${untilLabel(value)} ${verb}`}
      </button>
      <span aria-hidden className="my-1.5 w-px bg-[color-mix(in_oklab,var(--callout-tip-glyph)_35%,transparent)]" />
      <ChoiceMenu
        label="맡길 범위와 실행 위치"
        disabled={busy}
        groups={[
          {
            label: "어디까지",
            value,
            onChange: (v) => onChange(v as AiUntil),
            options: options.map((o) => ({
              value: o.key,
              label: o.label,
              hint: o.hint,
              meta: `${stageIndex(o.key) - from}단계`,
            })),
          },
          { label: "어디서", value: local ? "local" : "now", onChange: (v) => onLocal(v === "local"), options: WHERE },
        ]}
        className={`inline-flex h-full items-center rounded-r-full py-1.5 pr-3 pl-2.5 ${half}`}
      />
    </div>
  );
}

const LOG_MARK: Record<AiLogEntry["kind"], { glyph: string; color: string }> = {
  start: { glyph: "▶", color: "var(--ink-subtle)" },
  report: { glyph: "•", color: "var(--callout-tip-glyph)" },
  stage: { glyph: "✓", color: "var(--ink)" },
  done: { glyph: "✓", color: "var(--callout-tip-glyph)" },
  fail: { glyph: "✕", color: "var(--danger)" },
};

/**
 * 진행 로그. live 면 새 줄이 생길 때 맨 아래로 따라가고, 마지막 줄 뒤에
 * 점 세 개가 깜빡인다. 시각은 작업 시작부터 흐른 시간(분:초)으로 보인다.
 */
function AiLog({
  entries,
  live = false,
  fallback,
}: {
  entries: AiLogEntry[];
  live?: boolean;
  fallback?: string | null;
}) {
  const box = useRef<HTMLOListElement>(null);
  const last = entries[entries.length - 1]?.at;
  useEffect(() => {
    if (live && box.current) box.current.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [live, last]);

  if (entries.length === 0) {
    return (
      <p className="m-0 mt-2 text-[12.5px] text-ink-muted">
        {fallback ?? "진행 로그를 기다리는 중"}
        {live && <Dots />}
      </p>
    );
  }
  const start = Date.parse(entries[0].at);

  return (
    <ol
      ref={box}
      className="m-0 mt-2 max-h-[180px] list-none space-y-1 overflow-y-auto p-0 pr-1"
    >
      {entries.map((e, i) => {
        const mark = LOG_MARK[e.kind] ?? LOG_MARK.report;
        const isLast = i === entries.length - 1;
        return (
          <li
            key={`${e.at}-${i}`}
            className={`flex items-baseline gap-2 text-[12.5px] leading-[1.5] ${isLast && live ? "topic-rise" : ""}`}
          >
            <span className="w-[38px] shrink-0 text-right font-mono text-[10.5px] tabular-nums text-ink-subtle">
              {clock(Date.parse(e.at) - start)}
            </span>
            <span aria-hidden className="w-3 shrink-0 text-center text-[10px]" style={{ color: mark.color }}>
              {mark.glyph}
            </span>
            <span
              className={`min-w-0 break-words ${
                isLast && live ? "text-ink" : e.kind === "stage" ? "font-semibold text-ink-soft" : "text-ink-muted"
              }`}
            >
              {e.message}
              {isLast && live && <Dots />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Dots() {
  return (
    <span aria-hidden className="ai-dots ml-0.5 inline-flex">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

/** 작업 시작부터 흐른 시간. 1초마다 다시 그린다. */
function Elapsed({ since }: { since: string }) {
  // 서버와 브라우저의 "지금"이 달라 그대로 그리면 하이드레이션이 깨진다.
  // 브라우저에 붙은 뒤부터 센다.
  const mounted = useMounted();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(t);
      clearTimeout(first);
    };
  }, []);
  return (
    <span className="font-mono text-[11px] tabular-nums text-ink-muted" title="작업 시작부터 흐른 시간">
      {mounted && now ? clock(now - Date.parse(since)) : "–:––"}
    </span>
  );
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function duration(from: string, to: string): string {
  const m = Math.round((Date.parse(to) - Date.parse(from)) / 60000);
  return m < 1 ? "1분 안쪽" : m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

/** 메시지 끝의 세션 주소는 "세션 보기" 링크로 바꾼다. */
function AiMessage({ text }: { text: string }) {
  const m = text.match(/^(.*?)\s*·\s*(https:\/\/claude\.ai\/\S+)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}{" "}
      <a href={m[2]} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">
        세션 보기 ↗
      </a>
    </>
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
