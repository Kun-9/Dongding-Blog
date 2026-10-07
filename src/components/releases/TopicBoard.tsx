"use client";

import { useState } from "react";
import { API } from "@/lib/api-routes";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { QueueRow } from "@/lib/release-queue";
import type { TopicRow } from "@/lib/release-topics";
import {
  STAGES,
  nextStage,
  stageIndex,
  stageLabel,
  type StageKey,
} from "@/lib/release-stages";

/** 단계마다 근거 칸에 무엇을 적을지. */
const NOTE_HINT: Partial<Record<StageKey, string>> = {
  demand:
    "검색어와 결과. 예: 'claude code auto mode' 한국어 글 0건, 영어 블로그 3건 — 설정법만 다루고 배경 설명 없음",
  sources: "읽은 문서·PR·이슈 링크와 릴리스 노트에 없던 맥락",
  draft: "초안에서 잡은 구성, 남은 빈칸",
  published: "발행 메모",
};

/** 진행판 칸 — 각 주제가 지금 붙잡고 있는 단계. 발행까지 끝나면 done. */
type Lane = StageKey | "done";

function laneOf(t: TopicRow): Lane {
  return nextStage(t.stage)?.key ?? "done";
}

const LANES: { key: Lane; label: string }[] = [
  ...STAGES.slice(1).map((s) => ({ key: s.key as Lane, label: s.label })),
  { key: "done", label: "발행됨" },
];

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

  return (
    <section className="mb-14">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-sans text-[17px] font-semibold tracking-[-0.01em] text-ink">
          집필 진행
        </h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-full border border-border-token px-3 py-1.5 font-sans text-[13px] text-ink-soft transition-colors hover:border-border-strong"
        >
          {creating ? "닫기" : "새 주제 +"}
        </button>
      </div>

      {/* 진행판 — 칸마다 그 단계를 붙잡고 있는 주제 수. 누르면 거른다. */}
      <ol className="m-0 mb-4 grid list-none grid-cols-5 gap-1 p-0">
        {LANES.map((l, i) => {
          const n = active.filter((t) => laneOf(t) === l.key).length;
          const on = lane === l.key;
          return (
            <li key={l.key} className="min-w-0">
              <button
                type="button"
                onClick={() => setLane(on ? null : l.key)}
                aria-pressed={on}
                className={`flex w-full flex-col items-start rounded-lg border px-2 py-2 text-left transition-colors sm:px-3 ${
                  on
                    ? "border-ink bg-surface"
                    : "border-border-token bg-surface hover:border-border-strong"
                }`}
              >
                <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  {/* 스테퍼와 번호를 맞춘다 — 1단계(글감 묶음)는 만들 때 끝난다. */}
                  {i + 1 < LANES.length ? `${i + 2}단계` : "끝"}
                </span>
                <span className="mt-0.5 w-full truncate font-sans text-[12px] text-ink-soft sm:text-[13px]">
                  {l.label}
                </span>
                <span
                  className={`mt-1 font-sans text-[20px] font-semibold tabular-nums leading-none ${
                    n > 0 ? "text-ink" : "text-ink-subtle"
                  }`}
                >
                  {n}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {creating && (
        <div className="mb-3 rounded-xl border border-border-strong bg-surface p-[14px]">
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
      )}

      {sorted.length === 0 ? (
        <p className="py-6 text-[14px] text-ink-muted">
          {lane ? "이 단계에 머문 주제가 없습니다." : "아직 주제가 없습니다. 쓸래로 고른 글감을 주제로 묶어보세요."}
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {sorted.map((t) => (
            <TopicCard
              key={t.id}
              topic={t}
              candidates={candidates}
              onChange={replace}
              onDelete={() => onTopicsChange(topics.filter((x) => x.id !== t.id))}
            />
          ))}
        </ul>
      )}

      {dropped.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDropped((v) => !v)}
            className="font-sans text-[13px] text-ink-muted"
          >
            접은 주제 {dropped.length} {showDropped ? "▴" : "▾"}
          </button>
          {showDropped && (
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {dropped.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  candidates={candidates}
                  onChange={replace}
                  onDelete={() => onTopicsChange(topics.filter((x) => x.id !== t.id))}
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

/* ── 단계 표시 ───────────────────────────────────────────────────────── */

function Stepper({ topic }: { topic: TopicRow }) {
  const done = stageIndex(topic.stage);
  const paused = topic.droppedReason !== null;

  return (
    <ol className="m-0 flex list-none items-start p-0">
      {STAGES.map((s, i) => {
        const isDone = i <= done;
        const isNext = i === done + 1 && !paused;
        return (
          <li key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-[9px] h-[2px] w-full ${
                  isDone ? "bg-ink" : "bg-border-token"
                }`}
              />
            )}
            <span
              className={`relative z-[1] flex size-5 items-center justify-center rounded-full border-2 font-sans text-[10px] font-bold ${
                isDone
                  ? "border-ink bg-ink text-bg"
                  : isNext
                    ? "border-accent bg-surface text-accent"
                    : "border-border-token bg-surface text-ink-subtle"
              }`}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={`mt-1 w-full truncate px-0.5 text-center font-sans text-[11px] ${
                isNext ? "font-semibold text-ink" : isDone ? "text-ink-soft" : "text-ink-subtle"
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── 주제 카드 ───────────────────────────────────────────────────────── */

function TopicCard({
  topic,
  candidates,
  onChange,
  onDelete,
}: {
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
  const urls = new Map(candidates.map((c) => [c.id, c.url]));
  const history = STAGES.filter((s) => topic.checks[s.key]);

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

  return (
    <li
      className={`rounded-xl border bg-surface p-[14px] ${
        paused ? "border-dashed border-border-token opacity-75" : "border-border-token"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-sans text-[15px] font-semibold text-ink">{topic.title}</span>
        {topic.postSlug && (
          <a
            href={`/posts/${topic.postSlug}`}
            className="font-mono text-[12px] text-ink-muted no-underline hover:text-ink"
          >
            /{topic.postSlug}
          </a>
        )}
      </div>
      {topic.angle && (
        <p className="m-0 mt-1 text-[13.5px] leading-[1.5] text-ink-soft">{topic.angle}</p>
      )}

      <div className="mt-3.5">
        <Stepper topic={topic} />
      </div>

      <p className="m-0 mt-3 text-[13px] leading-[1.5] text-ink-muted">
        {paused ? (
          <>접음 — {topic.droppedReason}</>
        ) : next ? (
          <>
            <span className="font-semibold text-ink-soft">다음 · {next.label}</span>{" "}
            {next.todo}
          </>
        ) : (
          <>발행까지 끝났습니다.</>
        )}
      </p>

      {topic.candidates.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {topic.candidates.map((c) => (
            <a
              key={c.id}
              href={urls.get(c.id) ?? `https://github.com/${c.repo}/releases/tag/${c.tag}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-surface-alt px-1.5 py-0.5 font-mono text-[11.5px] text-ink-muted no-underline hover:text-ink"
            >
              {c.repo.split("/")[1]} {c.tag}
            </a>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <ol className="m-0 mt-3 list-none space-y-1.5 border-t border-border-token p-0 pt-3">
          {history.map((s) => {
            const c = topic.checks[s.key]!;
            return (
              <li key={s.key} className="text-[13px] leading-[1.55]">
                <span className="font-sans font-semibold text-ink-soft">{s.label}</span>
                <span className="ml-1.5 text-[12px] tabular-nums text-ink-subtle">
                  {c.at.slice(0, 10)}
                </span>
                <div className="whitespace-pre-wrap break-words text-ink-muted">{c.note}</div>
              </li>
            );
          })}
        </ol>
      )}

      {mode === "advance" && next && (
        <div className="mt-3 space-y-2">
          <label className="block font-sans text-[12px] font-semibold text-ink-soft">
            {next.label} 근거
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={NOTE_HINT[next.key]}
            className="w-full rounded-lg border border-border-token bg-bg px-3 py-2 text-[13.5px] leading-[1.5] text-ink placeholder:text-ink-subtle focus:border-border-strong focus:outline-none"
          />
          {next.key === "draft" && (
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="글 slug"
              className="w-full rounded-lg border border-border-token bg-bg px-3 py-2 font-mono text-[13px] text-ink placeholder:text-ink-subtle focus:border-border-strong focus:outline-none"
            />
          )}
        </div>
      )}

      {mode === "drop" && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="접는 이유. 예: 이미 한국어 글이 충분하다"
          className="mt-3 w-full rounded-lg border border-border-token bg-bg px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-subtle focus:border-border-strong focus:outline-none"
        />
      )}

      {mode === "edit" && (
        <div className="mt-3 border-t border-border-token pt-3">
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
      )}

      {error && <p className="m-0 mt-2 text-[13px] text-danger">{error}</p>}

      {mode !== "edit" && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {mode === "view" ? (
            <>
              {!paused && next && (
                <Btn primary onClick={() => setMode("advance")}>
                  {next.label} 기록
                </Btn>
              )}
              {!paused && stageIndex(topic.stage) > 0 && (
                <Btn disabled={busy} onClick={() => patch({ action: "revert" })}>
                  {stageLabel(topic.stage)} 되돌리기
                </Btn>
              )}
              <Btn onClick={() => setMode("edit")}>편집</Btn>
              {paused ? (
                <Btn disabled={busy} onClick={() => patch({ action: "drop", reason: null })}>
                  다시 펼치기
                </Btn>
              ) : (
                next && <Btn onClick={() => setMode("drop")}>접기</Btn>
              )}
              <Btn disabled={busy} onClick={() => setConfirmDelete(true)}>
                삭제
              </Btn>
            </>
          ) : (
            <>
              <Btn
                primary
                disabled={busy || (mode === "advance" ? !note.trim() : !reason.trim())}
                onClick={() =>
                  mode === "advance"
                    ? patch({
                        action: "advance",
                        note,
                        postSlug: slug.trim() || null,
                      }).then((ok) => ok && setNote(""))
                    : patch({ action: "drop", reason }).then((ok) => ok && setReason(""))
                }
              >
                {mode === "advance" ? `${next?.label} 완료` : "접기"}
              </Btn>
              <Btn onClick={() => setMode("view")}>취소</Btn>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        title={`'${topic.title}' 주제를 지울까요?`}
        body="진행 기록이 함께 사라집니다. 글감은 남습니다. 멈추려는 것이라면 접기로 두세요."
        confirmLabel="지우기"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </li>
  );
}

function Btn({
  primary,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full border px-2.5 py-1 font-sans text-[12px] transition-colors disabled:opacity-40 ${
        primary
          ? "border-ink bg-ink text-bg"
          : "border-border-token text-ink-soft hover:border-border-strong"
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

  // 이미 묶인 글감이 먼저, 그다음 쓸래, 새 글감 순.
  const rank = (c: QueueRow) =>
    picked.has(c.id) ? 0 : c.status === "queued" ? 1 : 2;
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

  const field =
    "w-full rounded-lg border border-border-token bg-bg px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-subtle focus:border-border-strong focus:outline-none";

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="주제. 예: auto mode 가 기본값이 됐다"
        className={field}
      />
      <input
        value={angle}
        onChange={(e) => setAngle(e.target.value)}
        placeholder="왜 쓸 만한가 — 한 줄"
        className={field}
      />
      <div>
        <div className="mb-1 font-sans text-[12px] font-semibold text-ink-soft">
          묶을 글감 {picked.size}
        </div>
        <ul className="m-0 max-h-[220px] list-none overflow-y-auto rounded-lg border border-border-token p-1">
          {list.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1 hover:bg-hover">
                <input
                  type="checkbox"
                  checked={picked.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="translate-y-[1px]"
                />
                <span className="font-sans text-[12.5px] text-ink">{c.repo}</span>
                <span className="font-mono text-[12px] text-ink-soft">{c.tag}</span>
                {c.note && (
                  <span className="min-w-0 truncate text-[12px] text-ink-muted">{c.note}</span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </div>
      {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
      <div className="flex gap-1.5">
        <Btn primary disabled={busy || !title.trim()} onClick={submit}>
          {submitLabel}
        </Btn>
        <Btn onClick={onCancel}>취소</Btn>
      </div>
    </div>
  );
}
